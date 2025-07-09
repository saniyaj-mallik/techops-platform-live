import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  // Core automation reference
  automationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Automation', 
    required: true, 
    unique: true
  },
  
  // Basic info
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectName: { type: String, required: true },
  siteUrl: { type: String, required: true },
  siteType: { type: String, enum: ['staging', 'live'], required: true },
  
  // Timing
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number }, // in seconds
  
  // Overall status
  status: { 
    type: String, 
    enum: ['completed', 'failed', 'partial'], 
    required: true 
  },
  
  // Tasks executed
  tasksExecuted: {
    functionalityTest: { type: Boolean, default: false },
    pluginUpdate: { type: Boolean, default: false },
    themeUpdate: { type: Boolean, default: false },
    beforeAfterVRT: { type: Boolean, default: false },
    sitemapVRT: { type: Boolean, default: false }
  },
  
  // Results summary
  results: {
    functionalityTest: { 
      status: { type: String, enum: ['success', 'failure', 'skipped'], default: 'skipped' },
      message: { type: String }
    },
    pluginUpdate: {
      status: { type: String, enum: ['success', 'failure', 'skipped'], default: 'skipped' },
      updatesApplied: { type: Number, default: 0 },
      updatesFailed: { type: Number, default: 0 }
    },
    themeUpdate: {
      status: { type: String, enum: ['success', 'failure', 'skipped'], default: 'skipped' },
      updatesApplied: { type: Number, default: 0 },
      updatesFailed: { type: Number, default: 0 }
    },
    beforeAfterVRT: {
      status: { type: String, enum: ['success', 'failure', 'skipped'], default: 'skipped' },
      screenshotsCaptured: { type: Number, default: 0 },
      screenshotsFailed: { type: Number, default: 0 }
    },
    sitemapVRT: {
      status: { type: String, enum: ['success', 'failure', 'skipped'], default: 'skipped' },
      screenshotsCaptured: { type: Number, default: 0 },
      screenshotsFailed: { type: Number, default: 0 }
    }
  },
  
  // State changes summary
  stateChanges: {
    pluginsUpdated: { type: Number, default: 0 },
    themesUpdated: { type: Number, default: 0 },
    pluginsAdded: { type: Number, default: 0 },
    pluginsRemoved: { type: Number, default: 0 },
    themesAdded: { type: Number, default: 0 },
    themesRemoved: { type: Number, default: 0 }
  },
  
  // Detailed plugin and theme update information
  pluginUpdates: {
    updated: [{
      name: { type: String, required: true },
      oldVersion: { type: String, required: true },
      newVersion: { type: String, required: true }
    }],
    notUpdated: [{
      name: { type: String, required: true },
      currentVersion: { type: String, required: true },
      hasUpdate: { type: Boolean, default: false },
      availableVersion: { type: String }
    }]
  },
  
  themeUpdates: {
    updated: [{
      name: { type: String, required: true },
      oldVersion: { type: String, required: true },
      newVersion: { type: String, required: true }
    }],
    notUpdated: [{
      name: { type: String, required: true },
      currentVersion: { type: String, required: true },
      hasUpdate: { type: Boolean, default: false },
      availableVersion: { type: String }
    }]
  },
  
  // Reference to related data
  beforeStateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteState' },
  afterStateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteState' },
  beforeAfterVRTData: { type: mongoose.Schema.Types.ObjectId, ref: 'BeforeAfterVRT' },
  
  // Issues and errors
  issues: [{
    task: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Generation info
  generatedAt: { type: Date, default: Date.now },
  version: { type: String, default: '1.0' }
});

// Virtual for success rate
ReportSchema.virtual('successRate').get(function() {
  const tasks = this.tasksExecuted;
  const results = this.results;
  
  let totalTasks = 0;
  let successfulTasks = 0;
  
  Object.keys(tasks).forEach(task => {
    if (tasks[task]) {
      totalTasks++;
      if (results[task]?.status === 'success') {
        successfulTasks++;
      }
    }
  });
  
  return totalTasks > 0 ? Math.round((successfulTasks / totalTasks) * 100) : 0;
});

// Create compound indexes for efficient querying
ReportSchema.index({ automationId: 1 }, { unique: true }); // Single automation can have only one report
ReportSchema.index({ projectId: 1, generatedAt: -1 }); // For listing reports by project, sorted by date
ReportSchema.index({ siteUrl: 1, status: 1 }); // For filtering reports by site and status

// Ensure virtual fields are serialized
ReportSchema.set('toJSON', { virtuals: true });
ReportSchema.set('toObject', { virtuals: true });

export default mongoose.models.Report || mongoose.model('Report', ReportSchema); 