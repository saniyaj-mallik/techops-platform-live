import mongoose from 'mongoose';

const AutomationSchema = new mongoose.Schema({
  siteUrl: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectName: { type: String, required: true }, // Keep for backward compatibility
  siteType: { type: String, enum: ['staging', 'live'], required: true },
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed'], 
    default: 'pending' 
  },
  
  // Automation preferences from request
  automationPrefs: {
    includeFunctionalityTest: { type: Boolean, default: false },
    includePluginUpdate: { type: Boolean, default: false },
    includeThemeUpdate: { type: Boolean, default: false },
    includeBeforeAfterVRT: { type: Boolean, default: false },
    includeSitemapVRT: { type: Boolean, default: false },
    automationFrequency: { type: String, default: 'manual' },
    automationTime: { type: String, default: '02:00' }
  },
  
  // Site information from request
  siteInfo: {
    siteName: { type: String },
    wordpressVersion: { type: String },
    phpVersion: { type: String },
    adminEmail: { type: String },
    isMultisite: { type: Boolean, default: false },
    activeTheme: { type: String },
    activeThemeVersion: { type: String }
  },
  
  // Configuration from request
  config: {
    timeout: { type: Number, default: 30000 },
    headless: { type: Boolean, default: true },
    screenshotFull: { type: Boolean, default: true }
  },
  
  // Sitemap configuration from request
  sitemapConfig: {
    pageSitemapUrl: { type: String, default: null },
    postSitemapUrl: { type: String, default: null }
  },
  
  // State references for before/after automation
  beforeState: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteState' },
  afterState: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteState' },
  
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  notificationEmails: { type: [String], default: [] }
});

// Virtual to populate project data
AutomationSchema.virtual('project', {
  ref: 'Project',
  localField: 'projectId',
  foreignField: '_id',
  justOne: true
});

// Virtual to get related site states
AutomationSchema.virtual('siteStates', {
  ref: 'SiteState',
  localField: '_id',
  foreignField: 'automationId'
});

// Virtual to get related test results
AutomationSchema.virtual('testResults', {
  ref: 'TestResult',
  localField: '_id',
  foreignField: 'automationId'
});

// Virtual to populate before state
AutomationSchema.virtual('beforeStateData', {
  ref: 'SiteState',
  localField: 'beforeState',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate after state
AutomationSchema.virtual('afterStateData', {
  ref: 'SiteState',
  localField: 'afterState',
  foreignField: '_id',
  justOne: true
});

AutomationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure virtual fields are serialized
AutomationSchema.set('toJSON', { virtuals: true });
AutomationSchema.set('toObject', { virtuals: true });

// Create compound indexes for efficient querying
AutomationSchema.index({ projectId: 1, createdAt: -1 }); // For listing automations by project
AutomationSchema.index({ siteUrl: 1, status: 1 }); // For filtering automations by site and status
AutomationSchema.index({ beforeState: 1, afterState: 1 }); // For state tracking

// Replace the export with the safe pattern to avoid OverwriteModelError
export default mongoose.models.Automation || mongoose.model('Automation', AutomationSchema); 