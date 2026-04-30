const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const cron = require('node-cron');
const { exec } = require('child_process');
const util = require('util');
const mysql = require('mysql2/promise');
const SystemSetting = require('../models/SystemSetting');

const execPromise = util.promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '..', 'backups');
    this.tempDir = path.join(__dirname, '..', 'backups', 'temp');
    this.isInitialized = false;
    this.scheduledJob = null;
    this.isBackupRunning = false;
    this.currentBackupProcess = null;
    
    // Ensure backup directories exist
    this.ensureDirectories();
  }

  /**
   * Initialize backup service - load settings and schedule automatic backups
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[BackupService] Already initialized');
      return;
    }

    try {
      await this.ensureDirectories();
      await this.loadSettings();
      await this.scheduleAutomaticBackups();
      await this.cleanupOldBackups();
      
      this.isInitialized = true;
      console.log('[BackupService] Initialized successfully');
    } catch (error) {
      console.error('[BackupService] Initialization error:', error.message);
    }
  }

  /**
   * Ensure backup directories exist
   */
  async ensureDirectories() {
    const dirs = [this.backupDir, this.tempDir];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[BackupService] Created directory: ${dir}`);
      }
    }
  }

  /**
   * Load backup settings from database
   */
  async loadSettings() {
    try {
      const settings = await SystemSetting.findAll({
        where: { key: ['auto_backup', 'backup_frequency', 'backup_retention'] }
      });

      this.settings = {
        autoBackup: false,
        backupFrequency: 'daily',
        backupRetention: 30
      };

      settings.forEach(setting => {
        const key = setting.key;
        const value = setting.value;

        if (key === 'auto_backup') {
          this.settings.autoBackup = value === 'true' || value === '1' || value === true;
        } else if (key === 'backup_frequency') {
          this.settings.backupFrequency = value;
        } else if (key === 'backup_retention') {
          this.settings.backupRetention = parseInt(value, 10) || 30;
        }
      });

      console.log('[BackupService] Settings loaded:', this.settings);
    } catch (error) {
      console.error('[BackupService] Failed to load settings:', error.message);
      // Use defaults
      this.settings = {
        autoBackup: false,
        backupFrequency: 'daily',
        backupRetention: 30
      };
    }
  }

  /**
   * Update backup settings
   */
  async updateSettings(updates) {
    try {
      // Helper to convert camelCase to snake_case for database keys
      const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

      for (const [key, value] of Object.entries(updates)) {
        const dbKey = camelToSnake(key); // Convert frontend key (camelCase) to DB key (snake_case)

        let setting = await SystemSetting.findOne({ where: { key: dbKey } });
        
        if (setting) {
          setting.value = String(value);
          await setting.save();
        } else {
          await SystemSetting.create({ key: dbKey, value: String(value) });
        }

        // Update in-memory settings (this.settings uses camelCase keys)
        if (key === 'autoBackup') {
          this.settings.autoBackup = (String(value) === 'true' || String(value) === '1' || value === true);
        } else if (key === 'backupFrequency') {
          this.settings.backupFrequency = value;
        } else if (key === 'backupRetention') {
          this.settings.backupRetention = parseInt(value, 10) || 30;
        }
      }

      console.log('[BackupService] Settings updated:', updates);

      // Re-schedule if auto backup or frequency changed
      if (updates.autoBackup !== undefined || updates.backupFrequency !== undefined) {
        await this.scheduleAutomaticBackups();
      }

      return true;
    } catch (error) {
      console.error('[BackupService] Failed to update settings:', error.message);
      return false;
    }
  }

  /**
   * Get database configuration from environment
   */
  getDbConfig() {
    return {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fyp_management'
    };
  }

  /**
   * Create database dump using pure JavaScript (no CLI dependency)
   */
  async createDump(outputPath) {
    const dbConfig = this.getDbConfig();
    let connection;

    try {
      console.log('[BackupService] Connecting to database for dump...');
      connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        multipleStatements: true
      });

      console.log('[BackupService] Connected to database, starting dump...');

      // Get all tables
      const [tables] = await connection.query('SHOW TABLES');
      const tableNames = tables.map(row => Object.values(row)[0]);

      console.log(`[BackupService] Found ${tableNames.length} tables to dump`);

      // Build SQL dump
      let sqlDump = `-- Database Backup\n`;
      sqlDump += `-- Database: ${dbConfig.database}\n`;
      sqlDump += `-- Date: ${new Date().toISOString()}\n\n`;

      sqlDump += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

      // Dump each table
      for (const tableName of tableNames) {
        console.log(`[BackupService] Dumping table: ${tableName}`);

        // Get CREATE TABLE statement
        const [createStatement] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
        sqlDump += `-- Table structure for ${tableName}\n`;
        sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sqlDump += createStatement[0]['Create Table'] + ';\n\n';

        // Get table data
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);

        if (rows.length > 0) {
          sqlDump += `-- Data for ${tableName}\n`;
          sqlDump += `LOCK TABLES \`${tableName}\` WRITE;\n`;

          // Insert in batches to avoid too large queries
          const batchSize = 100;
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const values = batch.map(row => {
              return '(' + Object.values(row).map(val => {
                if (val === null) return 'NULL';
                if (typeof val === 'number') return val;
                if (typeof val === 'object' && val instanceof Date) {
                  return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                }
                // Escape special characters
                return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
              }).join(', ') + ')';
            }).join(',\n');

            const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
            sqlDump += `INSERT INTO \`${tableName}\` (${columns}) VALUES\n${values};\n`;
          }

          sqlDump += `UNLOCK TABLES;\n\n`;
        }
      }

      sqlDump += `SET FOREIGN_KEY_CHECKS=1;\n`;

      // Write to file
      fs.writeFileSync(outputPath, sqlDump, 'utf8');

      const stats = fs.statSync(outputPath);
      console.log(`[BackupService] Dump created successfully: ${this.formatBytes(stats.size)}`);

      return {
        success: true,
        path: outputPath,
        size: stats.size
      };
    } catch (error) {
      console.error('[BackupService] Dump creation failed:', error.message);
      throw new Error(`Database dump failed: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
        console.log('[BackupService] Database connection closed');
      }
    }
  }

  /**
   * Compress backup file using ZIP
   */
  async compressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        const stats = fs.statSync(outputPath);
        const originalSize = fs.statSync(inputPath).size;
        const compressionRatio = ((1 - stats.size / originalSize) * 100).toFixed(2);
        
        console.log(`[BackupService] Compressed: ${originalSize} → ${stats.size} bytes (${compressionRatio}% reduction)`);
        
        resolve({
          success: true,
          path: outputPath,
          size: stats.size,
          originalSize,
          compressionRatio
        });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.file(inputPath, { name: path.basename(inputPath) });
      archive.finalize();
    });
  }

  /**
   * Create a complete backup (dump + compress)
   */
  async createBackup(createdBy = 'system') {
    if (this.isBackupRunning) {
      throw new Error('A backup is already running');
    }

    this.isBackupRunning = true;
    this.currentBackupProcess = createdBy;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFilename = `backup-${timestamp}`;
      
      const sqlPath = path.join(this.tempDir, `${baseFilename}.sql`);
      const zipPath = path.join(this.backupDir, `${baseFilename}.sql.zip`);

      console.log(`[BackupService] Creating backup (requested by: ${createdBy})`);

      // Step 1: Create database dump
      console.log('[BackupService] Step 1/3: Creating database dump...');
      const dumpResult = await this.createDump(sqlPath);
      
      // Step 2: Compress the dump
      console.log('[BackupService] Step 2/3: Compressing backup...');
      const compressResult = await this.compressFile(sqlPath, zipPath);
      
      // Step 3: Clean up temporary SQL file
      console.log('[BackupService] Step 3/3: Cleaning up...');
      fs.unlinkSync(sqlPath);

      const result = {
        success: true,
        filename: `${baseFilename}.sql.zip`,
        path: zipPath,
        size: compressResult.size,
        originalSize: compressResult.originalSize,
        compressionRatio: compressResult.compressionRatio,
        createdAt: new Date().toISOString(),
        createdBy
      };

      console.log('[BackupService] Backup created successfully:', result.filename);
      
      return result;
    } catch (error) {
      console.error('[BackupService] Backup creation failed:', error.message);
      throw error;
      throw { success: false, error: `Backup creation failed: ${error.message}` };
    } finally {
      this.isBackupRunning = false;
      this.currentBackupProcess = null;
    }
  }

  /**
   * Get list of all backups
   */
  async getBackupList() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return { success: true, backups: [], totalSize: 0 };
      }

      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql.zip') || file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            filename: file,
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            createdAt: stats.birthtime,
            createdAtFormatted: stats.birthtime.toLocaleString(),
            path: filePath,
            isCompressed: file.endsWith('.zip')
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        success: true,
        backups: files,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        count: files.length
      };
    } catch (error) {
      console.error('[BackupService] Failed to get backup list:', error.message);
      return { success: false, backups: [], error: error.message };
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupFilename) {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);

      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      let sqlPath = backupPath;
      let needsDecompression = false;

      // Check if backup is compressed
      if (backupFilename.endsWith('.zip')) {
        needsDecompression = true;
        sqlPath = path.join(this.tempDir, `restore-${Date.now()}.sql`);

        // Decompress the backup
        console.log('[BackupService] Decompressing backup...');
        const decompressCommand = `powershell -Command "Expand-Archive -Path '${backupPath.replace(/'/g, "''")}' -DestinationPath '${this.tempDir.replace(/'/g, "''")}' -Force"`;
        await execPromise(decompressCommand);

        // Find the extracted SQL file
        const extractedFiles = fs.readdirSync(this.tempDir)
          .filter(f => f.endsWith('.sql') && f.startsWith('backup-'));

        if (extractedFiles.length === 0) {
          throw new Error('No SQL file found in backup archive');
        }

        sqlPath = path.join(this.tempDir, extractedFiles[0]);
      }

      // Read SQL file
      console.log('[BackupService] Reading SQL file...');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');

      // Restore database using JavaScript
      const dbConfig = this.getDbConfig();
      let connection;

      try {
        console.log('[BackupService] Connecting to database for restore...');
        connection = await mysql.createConnection({
          host: dbConfig.host,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database,
          multipleStatements: true
        });

        console.log('[BackupService] Restoring database from backup...');
        
        // Disable foreign key checks and unique checks for faster restore
        await connection.query('SET FOREIGN_KEY_CHECKS=0');
        await connection.query('SET UNIQUE_CHECKS=0');
        await connection.query('SET AUTOCOMMIT=0');

        // Split SQL into larger chunks (50 statements per batch)
        const statements = sqlContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('--') && line.length > 0)
          .join('\n')
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt && stmt.length > 10); // Skip trivial statements

        console.log(`[BackupService] Processing ${statements.length} SQL statements...`);

        // Execute in batches for better performance
        const batchSize = 50;
        let executedCount = 0;

        for (let i = 0; i < statements.length; i += batchSize) {
          const batch = statements.slice(i, i + batchSize);
          const batchSQL = batch.join(';');
          
          try {
            if (batchSQL.trim()) {
              await connection.query(batchSQL);
              executedCount += batch.length;
              
              // Progress logging
              console.log(`[BackupService] Progress: ${Math.min(executedCount, statements.length)}/${statements.length} statements`);
            }
          } catch (error) {
            console.error(`[BackupService] Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
            // Try executing statements individually if batch fails
            for (const statement of batch) {
              if (statement) {
                try {
                  await connection.query(statement);
                  executedCount++;
                } catch (individualError) {
                  // Log but continue - some statements might fail due to dependencies
                  console.error(`[BackupService] Statement failed:`, individualError.message.substring(0, 100));
                }
              }
            }
          }
        }

        // Commit and restore settings
        await connection.query('COMMIT');
        await connection.query('SET UNIQUE_CHECKS=1');
        await connection.query('SET FOREIGN_KEY_CHECKS=1');
        await connection.query('SET AUTOCOMMIT=1');

        console.log(`[BackupService] Backup restored successfully. Executed ${executedCount} statements.`);

        return {
          success: true,
          message: 'Backup restored successfully',
          backupFile: backupFilename,
          statementsExecuted: executedCount
        };
      } catch (error) {
        console.error('[BackupService] Restore failed:', error.message);
        throw error;
      console.error('[BackupService] Restore failed:', error.message); // Log original error
      throw { success: false, error: `Restore failed: ${error.message}` }; // Throw structured error
      } finally {
        if (connection) {
          await connection.end();
          console.log('[BackupService] Database connection closed');
        }

        // Clean up temporary file if we decompressed
        if (needsDecompression && fs.existsSync(sqlPath)) {
          fs.unlinkSync(sqlPath);
          console.log('[BackupService] Temporary file cleaned up');
        }
      }
    } catch (error) {
      console.error('[BackupService] Restore failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete backup file
   */
  async deleteBackup(backupFilename) {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);
      
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
      }

      fs.unlinkSync(backupPath);
      console.log('[BackupService] Deleted backup:', backupFilename);
      
      return {
        success: true,
        message: 'Backup deleted successfully'
      };
    } catch (error) {
      console.error('[BackupService] Delete failed:', error.message);
      return { success: false, error: error.message };
      throw { success: false, error: `Delete failed: ${error.message}` }; // Throw structured error
    }
  }

  /**
   * Clean up old backups based on retention setting
   */
  async cleanupOldBackups() {
    try {
      const retentionDays = this.settings.backupRetention || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      console.log(`[BackupService] Cleaning up backups older than ${retentionDays} days...`);

      const result = await this.getBackupList();
      let deletedCount = 0;
      let freedSpace = 0;

      for (const backup of result.backups) {
        if (new Date(backup.createdAt) < cutoffDate) {
          const deleteResult = await this.deleteBackup(backup.filename);
          if (deleteResult.success) {
            deletedCount++;
            freedSpace += backup.size;
          }
        }
      }

      console.log(`[BackupService] Cleanup complete: ${deletedCount} backups deleted, ${this.formatBytes(freedSpace)} freed`);
      
      return {
        success: true,
        deletedCount,
        freedSpace,
        freedSpaceFormatted: this.formatBytes(freedSpace)
      };
    } catch (error) {
      console.error('[BackupService] Cleanup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop the currently running backup process
   */
  async stopBackup() {
    if (!this.isBackupRunning) {
      return { success: false, message: 'No backup is currently running' };
    }

    try {
      console.log('[BackupService] Stopping current backup process...');
      
      // Note: Since we're using async operations, we can't directly kill them
      // But we can mark the process as stopped and let it finish gracefully
      // For more advanced stopping, we'd need to implement cancellation tokens
      
      this.isBackupRunning = false;
      this.currentBackupProcess = null;
      
      console.log('[BackupService] Backup process marked for stopping');
      return { success: true, message: 'Backup process stopped' };
    } catch (error) {
      console.error('[BackupService] Error stopping backup:', error.message);
      return { success: false, message: 'Failed to stop backup process' };
    }
  }

  /**
   * Get current backup status
   */
  getBackupStatus() {
    return {
      isRunning: this.isBackupRunning,
      currentProcess: this.currentBackupProcess,
      autoBackupEnabled: this.settings.autoBackup,
      backupFrequency: this.settings.backupFrequency,
      backupRetention: this.settings.backupRetention
    };
  }

  /**
   * Schedule automatic backups based on frequency setting
   */
  async scheduleAutomaticBackups() {
    // Cancel existing schedule
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
      console.log('[BackupService] Previous schedule cancelled');
    }

    if (!this.settings.autoBackup) {
      console.log('[BackupService] Automatic backups disabled');
      return;
    }

    // Map frequency to cron expression
    const cronExpressions = {
      'hourly': '0 * * * *',      // Every hour
      'daily': '0 2 * * *',       // Every day at 2 AM
      'weekly': '0 2 * * 0',      // Every Sunday at 2 AM
      'monthly': '0 2 1 * *'      // 1st of every month at 2 AM
    };

    const cronExpression = cronExpressions[this.settings.backupFrequency] || cronExpressions.daily;
    
    console.log(`[BackupService] Scheduling automatic backups: ${this.settings.backupFrequency} (${cronExpression})`);

    this.scheduledJob = cron.schedule(cronExpression, async () => {
      try {
        // Check if a backup is already running
        if (this.isBackupRunning) {
          console.log('[BackupService] Skipping scheduled backup - another backup is already running');
          return;
        }

        console.log('[BackupService] Running scheduled automatic backup...');
        await this.createBackup('auto-scheduled');
        await this.cleanupOldBackups();
        console.log('[BackupService] Scheduled backup completed');
      } catch (error) {
        console.error('[BackupService] Scheduled backup failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Africa/Addis_Ababa'
    });

    console.log('[BackupService] Automatic backup schedule active');
  }

  /**
   * Download backup file (returns file path for streaming)
   */
  getBackupFilePath(backupFilename) {
    const backupPath = path.join(this.backupDir, backupFilename);
    
    if (!fs.existsSync(backupPath)) {
      return null;
    }
    
    return backupPath;
  }

  /**
   * Format bytes to human-readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Get backup statistics
   */
  async getStats() {
    const result = await this.getBackupList();
    const oldestBackup = result.backups.length > 0 
      ? result.backups[result.backups.length - 1] 
      : null;
    
    return {
      totalBackups: result.count,
      totalSize: result.totalSizeFormatted,
      oldestBackup: oldestBackup ? {
        filename: oldestBackup.filename,
        date: oldestBackup.createdAtFormatted
      } : null,
      newestBackup: result.backups.length > 0 ? {
        filename: result.backups[0].filename,
        date: result.backups[0].createdAtFormatted
      } : null,
      autoBackupEnabled: this.settings.autoBackup,
      backupFrequency: this.settings.backupFrequency,
      retentionDays: this.settings.backupRetention
    };
  }
}

// Export singleton instance
const backupService = new BackupService();

module.exports = backupService;
