// src/pages/auth/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BarChart3, LogIn, Menu, X, BookOpen, 
  MessageSquare, Shield, Mail, Phone, GraduationCap, 
  Building, ClipboardCheck, Calendar, FolderOpen, ArrowRight, Briefcase,
  CheckCircle, Sparkles, Layout, Zap, Target, ChevronRight
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import InputField from '../../components/common/InputField';
import SelectDropdown from '../../components/common/SelectDropdown';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { validateEmail, validatePassword, validateStudentId, validateCGPA } from '../../utils/validation';
import toast from 'react-hot-toast';

// Define static data outside the component to prevent re-creation on every render.
// This is a crucial optimization to prevent infinite loops in child components
// that might use these arrays as useEffect dependencies.
const navLinks = [
  { name: 'Home', id: 'home' },
  { name: 'Features', id: 'features' },
  { name: 'Roles', id: 'roles' },
  { name: 'Workflow', id: 'workflow' },
  { name: 'Contact', id: 'contact' },
];

const departments = [
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Information Technology', label: 'Information Technology' },
  { value: 'Information Systems', label: 'Information Systems' }
];

const sections = [
  { value: 'A', label: 'Section A' },
  { value: 'B', label: 'Section B' },
  { value: 'C', label: 'Section C' }
];

const statistics = [
  { number: '1200+', label: 'Active Students', icon: Users },
  { number: '150+', label: 'Projects Done', icon: FolderOpen },
  { number: '45', label: 'Faculty Advisors', icon: BookOpen },
  { number: '3', label: 'Core Departments', icon: Building }
];

const features = [
  { icon: Layout, title: 'Smart Dashboard', description: 'A centralized hub for all your project needs, from proposal to final defense.' },
  { icon: Users, title: 'Group Formation', description: 'Intelligent grouping system based on CGPA and department criteria.' },
  { icon: MessageSquare, title: 'Real-time Chat', description: 'Seamless communication channel between students and advisors.' },
  { icon: BarChart3, title: 'Progress Tracking', description: 'Visual milestones and deadline management to keep you on track.' },
  { icon: Calendar, title: 'Auto Scheduling', description: 'Conflict-free defense scheduling for students and evaluators.' },
  { icon: ClipboardCheck, title: 'Proposal Management', description: 'Streamlined submission, review, and approval workflows for project proposals.' }
];
const userRoles = [
  { icon: GraduationCap, title: 'Students', desc: 'Register, submit proposals, and track progress milestones.', color: 'bg-violet-600' },
  { icon: BookOpen, title: 'Advisors', desc: 'Mentor assigned groups, review proposals, and approve final draft.', color: 'bg-fuchsia-600' },
  { icon: Building, title: 'Department Heads', desc: 'Approve student their respective student registrations, and oversee department activities.', color: 'bg-amber-600' },
  { icon: Briefcase, title: 'Faculty Head', desc: 'Monitor performance across all departments and generate faculty-wide reports.', color: 'bg-indigo-600' },
  { icon: Shield, title: 'System Administrator', desc: 'Configure system settings, manage user accounts, and ensure data security.', color: 'bg-slate-800' }
];

const howItWorksSteps = [
  { step: '01', title: 'Registration', desc: 'Create your account and await verification from your respective the Department Head.', icon: LogIn },
  { step: '02', title: 'Group Formation', desc: 'automatic group formation by respective Department head.', icon: Users },
  { step: '03', title: 'Project Management', desc: 'Submit proposals, track progress,manage documentation,and implementation progression .', icon: Zap }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { register, users, isRegistrationOpen, user } = useAuth();
  const { notifyAdminSupport, notifyDeptHeadNewRegistration } = useNotification();
  
  // State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Forms
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    studentId: '', department: '', section: '', cgpa: '', gender: ''
  });
  const [errors, setErrors] = useState({});

  // Navbar Scroll Effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animation Variants
  const staggerItem = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  // Handlers
  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Navbar height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const newInquiry = {
      id: Date.now(),
      name: contactForm.name,
      email: contactForm.email,
      message: contactForm.message,
      date: new Date().toISOString(),
      status: 'pending'
    };
    const existingInquiries = JSON.parse(localStorage.getItem('fypInquiries') || '[]');
    localStorage.setItem('fypInquiries', JSON.stringify([newInquiry, ...existingInquiries]));

    notifyAdminSupport({
      name: contactForm.name,
      email: contactForm.email,
      message: contactForm.message
    });

    toast.success('Message sent successfully!');
    setContactForm({ name: '', email: '', message: '' });
  };

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterClick = () => {
    if (!isRegistrationOpen) {
      toast.error('Registration is not currently available.');
    } else {
      setShowRegister(true);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    const cgpaValue = parseFloat(formData.cgpa);

    if (!formData.name.trim()) newErrors.name = 'Full Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email format.';
    }

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    } else if (users.some(u => u.studentId === formData.studentId)) {
      newErrors.studentId = 'This Student ID is already registered.';
    }

    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.section) newErrors.section = 'Section is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';

    if (!formData.cgpa) {
      newErrors.cgpa = 'CGPA is required';
    } else if (isNaN(cgpaValue) || cgpaValue < 2.0 || cgpaValue > 4.0) {
      newErrors.cgpa = 'CGPA must be between 2.0 and 4.0.';
    }

    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    setLoading(true);
    const result = register({ ...formData, cgpa: parseFloat(formData.cgpa) });
    if (result.success) {
      notifyDeptHeadNewRegistration(formData.department, formData.name);
      toast.success(result.message);
      setShowRegister(false);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-violet-200 selection:text-violet-900 overflow-x-hidden">
      {/* NAVBAR */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20 flex items-center ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-white/50 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between w-full">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('home')}>
            <img src="/logo.png" alt="HU" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">FYP Manager</span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-2 bg-white/80 p-1.5 rounded-full border border-slate-200 shadow-sm backdrop-blur-md">
            {navLinks.map((link) => (
              <button 
                key={link.name} 
                onClick={() => scrollToSection(link.id)} 
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-slate-600 hover:text-violet-600 hover:bg-violet-50 transition-all"
              >
                {link.name}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-700 hover:text-violet-600 transition-colors">Log In</button>
            <button onClick={handleRegisterClick} className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-black transition-colors shadow-lg shadow-slate-900/20">Register</button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-gray-600"><Menu /></button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-white border-b border-slate-100 fixed top-20 left-0 right-0 z-40 overflow-hidden shadow-xl">
            <nav className="flex flex-col p-6 space-y-2">
              {navLinks.map((link) => (
                <button key={link.name} onClick={() => scrollToSection(link.id)} className="text-left px-4 py-3 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 hover:text-violet-600">
                  {link.name}
                </button>
              ))}
              <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                <button onClick={() => navigate('/login')} className="px-4 py-3 text-center font-bold text-slate-700 border border-slate-200 rounded-lg">Log In</button>
                <button onClick={handleRegisterClick} className="px-4 py-3 text-center font-bold text-white bg-slate-900 rounded-lg">Register</button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <main className="grow pt-24 w-full flex flex-col gap-24 lg:gap-40 pb-20">
        
        {/* HERO SECTION */}
        <section id="home" className="max-w-7xl mx-auto px-6 lg:px-8 pt-10 lg:pt-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 text-violet-700 font-medium text-sm border border-violet-100"
              >
                <Sparkles className="w-4 h-4" />
                <span>Faculty of Informatics</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }}
                className="text-5xl lg:text-7xl font-bold text-slate-900 leading-tight"
              >
                Streamline Your <br/>
                <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-600 to-fuchsia-600">Final Year Project</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
                className="text-lg text-slate-600 max-w-lg leading-relaxed"
              >
                The all-in-one platform for Hawassa University. Manage proposals, track progress, and schedule defenses with ease.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <button onClick={handleRegisterClick} className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:-translate-y-1 flex items-center gap-2">
                  Get Started <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all">
                  Login
                </button>
              </motion.div>

              <div className="pt-8 border-t border-slate-100 grid grid-cols-3 gap-8">
                {statistics.slice(0,3).map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl font-bold text-slate-900">{stat.number}</div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: 0.4 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-linear-to-tr from-violet-200 to-fuchsia-200 rounded-[3rem] rotate-6 blur-2xl opacity-50 -z-10"></div>
              <img src="/4thyear.png" alt="Dashboard Preview" className="w-full rounded-[2.5rem] shadow-2xl border-8 border-white" />
            </motion.div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-violet-100/40 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3 h-3" /> Features
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Powerful Features</h2>
            <p className="text-lg text-slate-600 leading-relaxed">Everything you need to manage your final year project efficiently.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((item, index) => (
              <motion.div 
                key={index}
                variants={staggerItem}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-violet-100 transition-all group"
              >
                <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 mb-6 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ROLES SECTION */}
        <section id="roles" className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Users className="w-3 h-3" /> Roles
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Who is it for?</h2>
            <p className="text-lg text-slate-600 leading-relaxed">Tailored experiences for every stakeholder in the academic process.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {userRoles.map((role, index) => (
              <motion.div 
                key={index}
                variants={staggerItem}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100 hover:-translate-y-2 transition-transform"
              >
                <div className={`h-24 ${role.color} relative`}>
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-2xl p-2 shadow-lg flex items-center justify-center">
                    <div className={`w-full h-full ${role.color} rounded-xl flex items-center justify-center text-white`}>
                      <role.icon className="w-8 h-8" />
                    </div>
                  </div>
                </div>
                <div className="pt-14 pb-8 px-8 text-center">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{role.title}</h3>
                  <p className="text-slate-500 text-sm mb-6">{role.desc}</p>
                  <div className="space-y-3 text-left">
                    {['Access Dashboard', 'Manage Tasks', 'View Reports'].map((f, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500" /> {f}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* WORKFLOW SECTION */}
        <section id="workflow" className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Zap className="w-3 h-3" /> Workflow
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">How It Works</h2>
            <p className="text-lg text-slate-600 leading-relaxed">A simple, streamlined process from registration to graduation.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {howItWorksSteps.map((step, index) => (
              <motion.div 
                key={index}
                variants={staggerItem}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="relative bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center"
              >
                <div className="w-16 h-16 mx-auto bg-slate-50 rounded-full flex items-center justify-center text-slate-900 font-bold text-xl mb-4 border-4 border-white shadow-sm">
                  {step.step}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="max-w-5xl mx-auto px-6 lg:px-8 w-full">
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col lg:flex-row">
            <div className="lg:w-2/5 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div>
                <h3 className="text-2xl font-bold mb-6">Contact Us</h3>
                <p className="text-slate-400 mb-8">Need help? Reach out to our support team.</p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center"><Mail className="w-5 h-5" /></div>
                    <div><div className="text-xs text-slate-400">Email</div><div className="font-medium">support@hu.edu.et</div></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center"><Phone className="w-5 h-5" /></div>
                    <div><div className="text-xs text-slate-400">Phone</div><div className="font-medium">+251 46 120 6579</div></div>
                  </div>
                </div>
              </div>
              <div className="mt-10 pt-10 border-t border-white/10">
                <div className="flex gap-4">
                  {/* Social Icons Placeholder */}
                </div>
              </div>
            </div>
            <div className="lg:w-3/5 p-10 lg:p-16">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                    <input type="text" name="name" value={contactForm.name} onChange={handleContactChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all" placeholder="Your name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                    <input type="email" name="email" value={contactForm.email} onChange={handleContactChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all" placeholder="you@example.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                  <textarea name="message" value={contactForm.message} onChange={handleContactChange} rows="4" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all resize-none" placeholder="How can we help?" required></textarea>
                </div>
                <button type="submit" className="w-full py-4 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200">Send Message</button>
              </form>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src="/logo.png" className="w-8 h-8 object-contain brightness-0 invert" />
                <span className="text-xl font-bold text-white">FYP Manager</span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-sm">
                Empowering students and faculty at Hawassa University with cutting-edge project management tools.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Platform</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                {navLinks.map(link => <li key={link.name}><button onClick={() => scrollToSection(link.id)} className="hover:text-violet-400 transition-colors">{link.name}</button></li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Contact</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li>Hawassa University, Ethiopia</li>
                <li>info@hu.edu.et</li>
                <li>+251 46 120 6579</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-center items-center gap-4">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} Faculty of Informatics. All rights reserved.</p>
            <div className="flex gap-6">
              {/* Social icons placeholders */}
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL */}
      <Modal isOpen={showRegister} onClose={() => setShowRegister(false)} title="Student Registration" size="lg" onConfirm={handleSubmit} confirmText="Submit Registration" loading={loading}>
        <div className="space-y-6">
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
            <h4 className="font-bold text-xl text-violet-900 mb-2">Final Year Student Registration</h4>
            <p className="text-violet-700">Register as a final-year student. Your registration will be reviewed and approved by your department head.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputField label="Full Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} required />
            <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="you@example.com" required />
            <InputField label="Student ID" name="studentId" value={formData.studentId} onChange={handleChange} error={errors.studentId} required />
            <InputField label="CGPA" name="cgpa" type="number" step="0.01" value={formData.cgpa} onChange={handleChange} error={errors.cgpa} required />
            <SelectDropdown label="Department" name="department" value={formData.department} onChange={handleChange} options={departments} error={errors.department} required />
            <SelectDropdown label="Section" name="section" value={formData.section} onChange={handleChange} options={sections} error={errors.section} required />
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6 h-[46px] items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={formData.gender === 'male'}
                    onChange={handleChange}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-700">Male</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={formData.gender === 'female'}
                    onChange={handleChange}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-700">Female</span>
                </label>
              </div>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
            </div>
            <InputField label="Password" name="password" type="password" value={formData.password} onChange={handleChange} error={errors.password} required />
            <InputField label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} required />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LandingPage;
