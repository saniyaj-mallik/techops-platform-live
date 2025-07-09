# Changelog

All notable changes to the TechOps Platform project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Automation Reports System**: Added `/api/reports` endpoint and WordPress plugin integration for generating automation reports after all tasks complete - reports are displayed in stats section with report IDs and timestamps
- **Project Linking System**: Implemented two-site project linking where staging site creates project ID and live site uses same ID to connect under single project
- **Manual Project ID Entry**: WordPress plugin dashboard now features editable Project ID field with visual workflow guide for linking existing projects across staging and live environments
- **Enhanced Dashboard UI**: Added visual project linking workflow guide with step-by-step instructions and improved styling for project configuration section
- **Project ID Save Functionality**: WordPress plugin now properly saves manually entered Project IDs with enhanced user feedback and validation
- **Real-time Project ID Validation**: Added instant validation feedback for Project ID format with visual indicators and success/error states
- **Before After VRT Model**: Created BeforeAfterVRT database model for storing screenshot data with automation ID linking and structured page/post arrays
- **Reference Screenshot System**: Automation API now captures reference screenshots at automation start for Before After VRT tests (blocking process ensures completion before workflow continues)
- **Before After VRT Workflow**: VRT API handles before_after_vrt test type by finding reference screenshots via automation ID and capturing comparison screenshots
- **Automated Screenshot Processing**: Implemented batch processing with concurrency control for efficient screenshot capture and Cloudinary uploads
- **Enhanced VRT User Feedback**: WordPress plugin now logs confirmation message when Before After VRT is enabled, informing users that reference screenshots are being captured
- **Playwright Screenshot Helper**: Created reusable `captureAndUploadScreenshot()` helper function for consistent screenshot capture across automation and VRT APIs using Playwright with Cloudinary upload
- **Real Screenshot Implementation**: Replaced mock screenshot functions with actual Playwright browser automation featuring full-page capture, cookie banner hiding, and organized Cloudinary folder structure
- **Batch Screenshot Processing**: Added `batchCaptureScreenshots()` helper function for controlled concurrent processing with customizable batch sizes and delays
- **Enhanced Project Detection**: Automation API now handles explicit project ID parameter for linking sites to existing projects instead of creating new ones
- **Smart Environment Detection**: Improved VRT API logic to determine staging vs live environment using exact hostname matching and URL pattern analysis
- **Project-Based URL Storage**: WordPress plugin now sends project ID with VRT requests, enabling automatic storage of extracted sitemap URLs in the corresponding Project model
- **Sitemap URL Storage**: Added `stagingSiteUrls` and `liveSiteUrls` fields to Project model for storing extracted page and post URLs with caching timestamps
- **Sitemap URL Extraction Function**: Created `extractSitemapUrls()` function that fetches and parses page and post sitemaps, returning organized arrays of URLs in separate `pages` and `posts` categories
- **Clean Sitemap Response**: VRT API now returns structured data with total counts and organized URL arrays for better integration and debugging
- **Redundancy Removal**: Eliminated duplicate sitemap URL parameters from WordPress plugin requests, using only clean `sitemap_config` object structure
- **VRT (Visual Regression Testing) Tasks**: Added two new automation tasks to WordPress plugin:
  - **Before After VRT Test**: Compares visual appearance of key pages before and after automation tasks with configurable page list
  - **Sitemap VRT Test**: Performs visual regression testing on pages from sitemap with configurable page limits and comprehensive result reporting
- **VRT Test Configuration**: Added VRT test preferences to WordPress plugin dashboard with separate checkboxes for each VRT test type
- **VRT Test Execution**: Implemented VRT test execution functions with extended timeouts, detailed logging, and visual change detection
- **Sitemap Configuration**: Added "Sitemap Details" section to WordPress plugin configuration with Page Sitemap URL and Post Sitemap URL fields for customized sitemap targeting
- **VRT API Endpoint**: Created `/api/test/vrt` endpoint to handle Visual Regression Testing requests with comprehensive logging, mock data responses, and test-type-specific result formatting
- **Sitemap URL Extraction**: Enhanced VRT API to actually fetch and parse sitemap.xml from target sites, extracting real page URLs for comprehensive testing instead of using mock data
- **Complete State Tracking**: WordPress plugin now sends both `stateType: 'before'` at automation start and `stateType: 'after'` when automation completes
- **State Type Classification**: WordPress plugin now sends `stateType: 'before'` with initial site state data to classify automation states
- **Automatic State Linking**: `/api/states` endpoint now automatically links before/after states to their corresponding automation records based on `stateType`
- **Before/After State Tracking**: Added `beforeState` and `afterState` fields to Automation model to reference SiteState documents for tracking state changes
- **Automation-State Linking**: WordPress plugin now captures automationId from `/api/automation` response and sends it with site state data to link automations with their corresponding states
- **Automation Database Integration**: Enhanced `/api/automation` endpoint to create automation records in MongoDB with project management, field mapping, and comprehensive data storage
- **Comprehensive Report Model**: Created complete Report database model that aggregates automation data into structured reports with timing information, task execution status, results summary, state changes tracking, Before After VRT data references, detailed plugin/theme update information, and issue logging for comprehensive automation analysis
- **Enhanced Reports API**: Completely rebuilt `/api/reports` endpoint with both POST (generate) and GET (retrieve) functionality:
  - **POST**: Generates comprehensive reports by analyzing automation, state, and VRT data with automatic state change calculation, success rate computation, and issue detection
  - **GET**: Retrieves reports with filtering by automation ID, project ID, site URL, status, and pagination support for dashboard integration
- **Intelligent Report Generation**: Reports API now automatically calculates plugin/theme updates, VRT screenshot success rates, functionality test results, and overall automation status with detailed issue tracking for failed operations
- **Report Data Aggregation**: Report generation includes before/after state comparison, VRT screenshot analysis, task execution summary, duration calculation, and comprehensive error tracking across all automation components
- **Detailed Plugin/Theme Tracking**: Reports now include specific plugin and theme names with version information for both updated and non-updated items, providing complete visibility into what changed during automation
- **Report Detail Page**: Created comprehensive report display page at `/reports/[id]` with beautiful UI showing automation results, plugin/theme updates, state changes, task execution status, and issue tracking
- **Report API by ID**: Added `/api/reports/[id]` endpoint for retrieving specific reports by report ID with full data population including project, state, and VRT information
- **Site State Type Field**: Added required `stateType` field to SiteState model to distinguish between "before" and "after" automation states with proper validation and indexing for efficient queries

### Changed
- **Improved Automation Logging**: Cleaned up confusing state-sending logs by using distinct messages for pre-automation vs after-automation state sending - removed duplicate and unclear log entries
- **Automation Preferences Validation**: Updated automation preferences validation to include new VRT test options in task selection requirements
- **Automation Task Execution**: Extended automation workflow to handle VRT tests with appropriate timeouts (60s for Before After VRT, 120s for Sitemap VRT)
- **Platform Communication**: Enhanced sendAutomationStart function to include VRT test preferences in automation data sent to platform
- **Sitemap Integration**: Updated automation API and database models to store and handle sitemap configuration (page/post sitemap URLs) from WordPress plugin
- **VRT Preferences Storage**: Enhanced Automation model and API to properly store VRT test preferences (Before After VRT and Sitemap VRT) in automation records
- **Project Sitemap Fields**: Added `stagingSiteMap` and `liveSiteMap` objects to Project model containing `pageSitemapUrl` and `postSitemapUrl` fields for both staging and live environments
- **Project Sitemap Integration**: Enhanced automation API to save sitemap configuration data to appropriate project sitemap fields based on site type (staging/live) when creating or updating projects
- **Simplified API Endpoints**: Removed GET endpoints from both `/api/automation` and `/api/states` to focus solely on data submission via POST requests
- **Enhanced SiteState Model**: Re-added `stateType` field to SiteState model as required field for better data organization and querying capabilities
- **Automation API Integration**: WordPress plugin now sends POST requests to `/api/automation` endpoint when automation starts with comprehensive data including project details, preferences, and site information
- **Screenshot Batch Performance**: Reduced concurrent screenshot batch size from 5 to 3 and increased batch delays from 1s to 2s for better stability with real Playwright browsers
- **Enhanced Error Handling**: Improved screenshot capture error handling with proper browser cleanup and detailed error logging for debugging failed captures
- **VRT Logging Improvements**: Enhanced WordPress plugin automation logging to clearly indicate screenshot phases:
  - Added clear "before" reference screenshot capture logging
  - Added clear "after" screenshot capture logging  
  - Added messaging that test results will be generated and available in platform dashboard
  - Improved consistency across Before After VRT and Sitemap VRT logging
- **Screenshot Processing Method**: Changed from batch processing to sequential (one-by-one) processing in both Automation API and VRT API for more reliable screenshot capture with better error tracking and stability
- **VRT API Blocking Behavior**: Modified VRT API (`/api/test/vrt`) to be blocking instead of non-blocking for Before After VRT tests, ensuring response is sent only after all "after" screenshots are captured and processed
- **Before After VRT Timeout**: Increased WordPress plugin timeout for Before After VRT tests from 60 seconds to 180 seconds to accommodate blocking screenshot capture process

### Fixed
- **Report Generation Validation Error**: Fixed "Report validation failed: themeUpdates.notUpdated.1.name: Path name is required" by adding proper defaults for missing plugin/theme names and versions in report generation
- **Report ID Display Issue**: Fixed WordPress plugin showing "Report ID: undefined" by updating Reports API response format to include `report_id`, `automation_id`, and `generated_at` fields that match WordPress plugin expectations
- **VRT "Not Found" Error**: Fixed Before After VRT failing with 404 error by adding sitemap URL extraction logic to automation API - now extracts and stores sitemap URLs from automation config if not already available in project database
- **VRT Test Timeout Issues**: Fixed timeout failures during Before After VRT processing by increasing WordPress plugin timeout from 3 minutes to 10 minutes to accommodate sequential screenshot processing and image optimization delays
- **Automation State Logging Timing**: Fixed confusing log message order where pre-automation state success message appeared after automation tasks started by making state sending synchronous with callback-based flow control
- **Cloudinary Image Size Limits**: Fixed "The image is too large to process" error by implementing multiple size reduction strategies:
  - Switched from PNG to JPEG format with 80% quality compression
  - Added Cloudinary transformations to limit dimensions (1920px width, 10000px height)
  - Implemented fallback to viewport-only screenshots for extremely large full-page captures
  - Added image size logging and better error handling for upload failures
- **Playwright Screenshot Quality Option**: Fixed "options.quality is unsupported for the png screenshots" error by removing quality parameter from PNG screenshot configuration in Playwright (quality is only supported for JPEG format)
- **VRT After Screenshot URLs**: Fixed issue where URLs were showing as "undefined" during after screenshot capture phase by explicitly extracting weblink properties from database documents and adding URL validation
- **VRT Test Preferences**: Fixed `getAutomationPreferences()` function to properly read VRT test checkbox values from the form, ensuring selected VRT tests are included in automation task execution

### Removed
- **API Logging**: Removed all console.log statements from automation and VRT API endpoints to reduce server-side logging noise, keeping only the essential sitemap URL fetch log
- **Backward Compatibility**: Preserved all existing functionality with global API for compatibility
- **WordPress Plugin Configuration System**: Complete configuration form in wdm-techops-pro plugin
- **API Integration Framework**: Built request body structure matching platform API requirements
- **Connection Testing**: Real-time platform connectivity testing from plugin dashboard
- **Configuration Management**: Save/retrieve plugin settings for platform API calls
- **CORS Middleware**: Centralized Cross-Origin Resource Sharing configuration for all API endpoints
- **Configurable CORS**: Environment-specific CORS settings with production security options
- **Global API Security**: Unified request handling with proper headers and preflight support
- Initial TechOps Platform setup with Next.js 15 and React 19
- WordPress login automation using Playwright
- Web-based test runner interface with real-time logging
- Test results dashboard with screenshot gallery
- API endpoints for test execution and result management
- Support for both headless and headed browser testing modes
- Responsive UI with dark mode support using Tailwind CSS v4
- Screenshot capture for success and failure scenarios
- Test statistics tracking and reporting
- Comprehensive project documentation and setup guides
- ESLint configuration with Next.js best practices
- Proper file structure for scalable development

### Changed
- **Intelligent URL Storage**: VRT API now automatically determines whether to store URLs in `stagingSiteUrls` or `liveSiteUrls` based on site URL matching project configuration
- **Project ID Integration**: Both VRT test types now include project ID in requests for automatic URL storage and project association
- Converted default Next.js template to TechOps platform
- Updated project metadata and branding
- Replaced default styling with custom Tailwind CSS design system

### Changed
- Updated login test script to use centralized configuration from config.js for consistency
- Improved configuration management with dedicated selectors and settings

### Fixed
- Fixed Next.js 15 compatibility issue with dynamic API routes requiring awaited params

### Technical Details
- **Frontend**: Next.js 15.3.4 with App Router, React 19.0.0
- **Testing**: Playwright 1.41.0 with Chromium automation
- **Styling**: Tailwind CSS v4 with PostCSS integration
- **Typography**: Geist Sans and Mono fonts
- **Development**: Turbopack for enhanced development experience 