import React, { useState } from 'react';
import { X, Sparkles, Lightbulb, Zap, Brain, CheckCircle, Copy, RefreshCw, Rocket, Target, TrendingUp, Star, Code, BookOpen, Award } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import InputField from './InputField';
import TextArea from './TextArea';
import toast from 'react-hot-toast';

const AISuggestionModal = ({ isOpen, onClose, onUseSuggestion, prefillData = {}, domains = [] }) => {
  const [query, setQuery] = useState({
    domain: prefillData.domain || '',
    keywords: prefillData.keywords || '',
    interests: prefillData.interests || '',
    description: prefillData.description || ''
  });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQuery(prev => ({ ...prev, [name]: value }));
  };

  const handleGetSuggestions = async () => {
    if (!query.domain && !query.keywords && !query.interests) {
      toast.error('Please fill in at least one field');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 AI Request:', query);
      const { aiSuggestionService } = await import('../../services');
      const result = await aiSuggestionService.getTitleSuggestions(query);
      console.log('✅ AI Response:', result);

      // Always show suggestions (even if AI failed, show fallback)
      const suggestions = result.data?.suggestions || [];
      const model = result.data?.model || 'unknown';
      console.log('📝 Suggestions count:', suggestions.length);
      console.log('🤖 AI Model used:', model);
      setSuggestions(suggestions);
      setHasSearched(true);

      if (result.success && suggestions.length > 0 && model !== 'fallback') {
        toast.success(`✨ Generated ${suggestions.length} AI suggestions!`, { duration: 3000 });
      } else if (result.success && suggestions.length > 0 && model === 'fallback') {
        toast('💡 Showing built-in suggestions (AI service not configured)', {
          icon: '💡',
          duration: 4000
        });
      } else if (result.success === false) {
      const errorMsg = result.errorType === 'rate_limit' 
        ? '🌤️ AI is busy. Showing smart suggestions!' 
        : result.errorType === 'auth' 
        ? '🔑 AI service needs configuration. Using fallback suggestions'
        : result.errorType === 'parsing' 
        ? '🧠 AI response format issue. Smart fallback activated'
        : result.errorType === 'network'
        ? '🌐 Network hiccup. Using cached/smart suggestions'
        : '⚠️ Temporary issue. Smart fallback suggestions shown';
      
      toast(`${errorMsg} (${result.errorType || 'unknown'})`, { duration: 6000 });
      
      // DEBUG: Log full response
      console.log('🔍 DEBUG AI Response:', result);
      console.log('📋 Full Error:', result.error);
      } else if (suggestions.length === 0) {
        toast('💡 No suggestions generated', { duration: 3000 });
      }
    } catch (error) {
      console.error('❌ AI Suggestion Error:', error);
      const errorMsg = error.error || error.message || 'Unknown error';
      toast.error(`❌ Failed to connect: ${errorMsg}`, {
        duration: 5000
      });
      setSuggestions([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggestion = (suggestion) => {
    onUseSuggestion(suggestion);
    onClose();
  };

  const handleCopyTitle = (title) => {
    navigator.clipboard.writeText(title);
  };

  const getDifficultyConfig = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Star, label: 'Beginner' };
      case 'medium':
        return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Target, label: 'Medium' };
      case 'advanced':
        return { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: Rocket, label: 'Advanced' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: TrendingUp, label: 'Medium' };
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span className="font-bold text-lg">AI Title Suggestions</span>
        </div>
      }
      showCancel={false}
      size="2xl"
    >
      <div className="space-y-6 -mx-2">
        {/* Query Form - Enhanced */}
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-5 border border-purple-100 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Lightbulb className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Tell AI Your Interests</h3>
              <p className="text-xs text-gray-500">Get personalized project recommendations</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Domain Selector - Enhanced */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                Preferred Domain
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="domain"
                  value={query.domain}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white font-medium transition-all hover:border-purple-200"
                >
                  <option value="">Select a domain...</option>
                  {domains.length > 0 ? (
                    domains.map(domain => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Artificial Intelligence">🤖 Artificial Intelligence</option>
                      <option value="Machine Learning">📊 Machine Learning</option>
                      <option value="Web Development">🌐 Web Development</option>
                      <option value="Mobile Applications">📱 Mobile Applications</option>
                      <option value="Internet of Things">🔌 Internet of Things</option>
                      <option value="Blockchain">⛓️ Blockchain</option>
                      <option value="Cybersecurity">🔒 Cybersecurity</option>
                      <option value="Data Science">📈 Data Science</option>
                      <option value="Cloud Computing">☁️ Cloud Computing</option>
                      <option value="Game Development">🎮 Game Development</option>
                    </>
                  )}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Keywords Input - Enhanced */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Target className="w-4 h-4 text-blue-600" />
                Keywords or Technologies
                <span className="text-xs text-gray-400 font-normal">(optional)</span>
              </label>
              <InputField
                label=""
                name="keywords"
                value={query.keywords}
                onChange={handleInputChange}
                placeholder="e.g., healthcare, prediction, machine learning..."
                className="border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl"
              />
            </div>

            {/* Interests Input - Enhanced */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Star className="w-4 h-4 text-yellow-600" />
                Your Interests
                <span className="text-xs text-gray-400 font-normal">(optional)</span>
              </label>
              <InputField
                label=""
                name="interests"
                value={query.interests}
                onChange={handleInputChange}
                placeholder="e.g., AI, mobile apps, IoT, blockchain..."
                className="border-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 rounded-xl"
              />
            </div>

            {/* Description Input - Enhanced */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Zap className="w-4 h-4 text-green-600" />
                Project Idea Description
                <span className="text-xs text-gray-400 font-normal">(optional)</span>
              </label>
              <TextArea
                label=""
                name="description"
                value={query.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describe what problem you want to solve or what kind of project you have in mind..."
                className="border-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 rounded-xl resize-none"
              />
            </div>

            {/* Generate Button - Enhanced */}
            <Button
              type="button"
              variant="primary"
              onClick={handleGetSuggestions}
              disabled={loading}
              icon={loading ? RefreshCw : Rocket}
              fullWidth
              size="lg"
              className={`py-3 text-base font-semibold rounded-xl shadow-lg transition-all ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl hover:scale-[1.02]'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  AI is thinking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate AI Suggestions
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Loading State - Enhanced */}
        {loading && (
          <div className="text-center py-12 px-4">
            <div className="relative inline-block">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600 animate-pulse" />
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">AI is generating ideas...</p>
            <p className="text-sm text-gray-500">Analyzing your interests and creating personalized suggestions</p>
          </div>
        )}

        {/* Suggestions Display - Enhanced */}
        {hasSearched && suggestions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                Suggested Projects
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                  {suggestions.length}
                </span>
              </h3>
            </div>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {suggestions.map((suggestion, index) => {
                const DiffIcon = getDifficultyConfig(suggestion.difficulty).icon;
                const diffConfig = getDifficultyConfig(suggestion.difficulty);
                
                return (
                  <div
                    key={index}
                    className="group border-2 border-gray-100 rounded-2xl p-5 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300 bg-white"
                  >
                    <div className="flex items-start gap-4">
                      {/* Number Badge */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {index + 1}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h4 className="font-bold text-gray-900 text-base mb-2 group-hover:text-purple-600 transition-colors line-clamp-2">
                          {suggestion.title}
                        </h4>
                        
                        {/* Description */}
                        {suggestion.description && (
                          <p className="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-3">
                            {suggestion.description}
                          </p>
                        )}
                        
                        {/* Technologies */}
                        {suggestion.technologies && suggestion.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {suggestion.technologies.map((tech, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200"
                              >
                                <Code className="w-3 h-3 inline mr-1" />
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {/* Difficulty Badge */}
                          {suggestion.difficulty && (
                            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 flex items-center gap-1.5 ${diffConfig.color}`}>
                              <DiffIcon className="w-3.5 h-3.5" />
                              {diffConfig.label}
                            </span>
                          )}
                          
                          {/* Why Suitable Badge */}
                          {suggestion.whySuitable && (
                            <span className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5" />
                              Perfect Match
                            </span>
                          )}
                        </div>
                        
                        {/* Why Suitable Description */}
                        {suggestion.whySuitable && (
                          <div className="mt-2 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span className="font-medium">{suggestion.whySuitable}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleCopyTitle(suggestion.title)}
                          className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all border-2 border-gray-100 hover:border-purple-200"
                          title="Copy title"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUseSuggestion(suggestion)}
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl px-4 shadow-md hover:shadow-lg transition-all"
                        >
                          Use This
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {hasSearched && suggestions.length === 0 && !loading && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium mb-2">No suggestions available</p>
            <p className="text-sm text-gray-400">AI service is temporarily unavailable. Please try again later.</p>
          </div>
        )}

        {/* Info Banner - Enhanced */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-purple-900">Powered by AI</p>
              <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                Get intelligent project recommendations based on your interests and skills. Generation may take 15-30 seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border-2 hover:bg-gray-50 transition-all"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AISuggestionModal;
