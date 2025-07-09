import mongoose from 'mongoose';

const PluginStateSchema = new mongoose.Schema({
  file: { type: String }, // Plugin file path (e.g., "plugin-folder/plugin-file.php")
  name: { type: String, required: true },
  version: { type: String, required: true }, // Also accepts "current_version"
  active: { type: Boolean, required: true },
  updateAvailable: { type: Boolean, default: false }, // Also accepts "update_available"
  newVersion: { type: String }, // Also accepts "new_version"
  author: { type: String },
  description: { type: String }
}, { _id: false });

const ThemeStateSchema = new mongoose.Schema({
  slug: { type: String }, // Theme slug/directory name
  name: { type: String, default: 'Unknown Theme' }, // Made optional with default
  version: { type: String, default: '0.0.0' }, // Made optional with default
  active: { type: Boolean, default: false },
  updateAvailable: { type: Boolean, default: false }, // Also accepts "update_available"
  newVersion: { type: String }, // Also accepts "new_version"
  author: { type: String },
  description: { type: String }
}, { _id: false });

const SiteStateSchema = new mongoose.Schema({
  siteName: { type: String, required: true },
  siteUrl: { type: String, required: true },

  plugins: [PluginStateSchema],
  themes: [ThemeStateSchema],

  // Automation context
  automationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Automation' },
  stateType: { 
    type: String, 
    enum: ['before', 'after'], 
    required: true,
    index: true
  },
  
  // Additional state info
  wordpressVersion: { type: String },
  phpVersion: { type: String },
  isMultisite: { type: Boolean, default: false },
  activeTheme: { type: String },
  pluginUpdateCount: { type: Number, default: 0 },
  themeUpdateCount: { type: Number, default: 0 },
  
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
SiteStateSchema.index({ siteUrl: 1, timestamp: -1 });
SiteStateSchema.index({ automationId: 1 });
SiteStateSchema.index({ stateType: 1, timestamp: -1 });
SiteStateSchema.index({ automationId: 1, stateType: 1 });

export default mongoose.models.SiteState || mongoose.model('SiteState', SiteStateSchema); 