# KINEET SaaS Architecture Documentation

## Overview

The Kineet platform has been transformed into a full SaaS-ready application with a modular architecture designed to work with external sending services (Email, WhatsApp, SMS) or compatible gateways.

## Architecture Layers

```
Frontend (React Components)
    ↓
Dashboard Context (State Management)
    ↓
Campaign Manager (Campaign CRUD & State)
    ↓
Queue Manager (Non-blocking Task Processing)
    ↓
Message Engine (Variable Replacement & Preparation)
    ↓
Provider Layer (Abstraction for Sending Services)
    ↓
Email Provider | WhatsApp Provider | SMS Provider
```

## Core Components

### 1. Type Definitions (`lib/types/`)

- **campaign.ts**: Campaign, Recipient, CampaignStatus, CampaignStats
- **provider.ts**: ProviderConfig, EmailConfig, WhatsAppConfig, SmsConfig, MessageResult
- **queue.ts**: QueueTask, QueueStats, QueueConfig
- **import.ts**: ImportRow, ImportResult, ImportPreview
- **notifications.ts**: Notification, NotificationType, NotificationCategory

### 2. Provider Layer (`lib/providers/`)

**Interfaces:**
- `IProvider`: Base interface for all providers
- `IEmailProvider`: Email-specific interface
- `IWhatsAppProvider`: WhatsApp-specific interface
- `ISmsProvider`: SMS-specific interface

**Mock Implementations (`lib/providers/mock/`):**
- `MockEmailProvider`: Simulates email sending with 95% success rate
- `MockWhatsAppProvider`: Simulates WhatsApp sending with 90% success rate
- `MockSmsProvider`: Simulates SMS sending with 93% success rate

**To replace with real providers:**
1. Implement the respective interface
2. Replace the mock provider in `useProviders` hook
3. No other code changes needed

### 3. Queue Manager (`lib/queue/`)

**Features:**
- Non-blocking task processing
- Configurable concurrency (default: 5 concurrent tasks)
- Automatic retry with configurable delay and max retries
- Progress callbacks for real-time updates
- Pause/Resume capability
- Campaign-specific task filtering

**Usage:**
```typescript
const queueManager = new QueueManager({ maxConcurrent: 5, retryDelay: 1000, maxRetries: 3 });
queueManager.setProvider(provider);
queueManager.addTasks(tasks);
queueManager.start();
```

### 4. Campaign Manager (`lib/campaign/`)

**Features:**
- CRUD operations for campaigns
- Automatic recipient status tracking
- Progress calculation
- Campaign lifecycle management (draft → sending → paused → completed/failed)
- Integration with Queue Manager
- Real-time statistics

**Usage:**
```typescript
const campaignManager = new CampaignManager(queueManager);
const campaign = campaignManager.createCampaign(
  "Campaign Name",
  "email",
  "Message content",
  recipients,
  "Subject"
);
campaignManager.startCampaign(campaign.id);
```

### 5. Message Engine (`lib/message/`)

**Features:**
- Variable replacement (`{{nom}}`, `{{prenom}}`, `{{entreprise}}`, `{{email}}`, `{{contact}}`)
- Message preparation per channel
- Character limit handling (SMS: 160, WhatsApp: 4096)
- SMS segment counting
- HTML sanitization for emails

**Usage:**
```typescript
const personalizedMessage = MessageEngine.replaceVariables(template, recipient);
const prepared = MessageEngine.prepareForChannel(message, 'email', subject);
```

### 6. Import Service (`lib/import/`)

**Features:**
- Excel/CSV file parsing
- Validation (required fields, format checking)
- Duplicate detection
- Error reporting
- Row editing and deletion
- Preview functionality

**Supported Formats:**
- XLSX, XLS, CSV

**Usage:**
```typescript
const result = await ImportService.parseFile(file);
const recipients = ImportService.toRecipients(result.rows);
```

### 7. Custom Hooks (`lib/hooks/`)

**useCampaigns:**
- Campaign CRUD operations
- Campaign selection
- Statistics retrieval

**useQueue:**
- Queue management
- Task operations
- Statistics

**useProviders:**
- Provider configuration
- Connection testing
- Provider selection

**useNotifications:**
- Notification management
- Toast integration
- Predefined notification helpers

### 8. Integration Layer (`lib/integration/`)

**Purpose:** Bridges the new SaaS architecture with the existing dashboard UI

**Functions:**
- `toDashboardCampaign()`: Convert new Campaign to dashboard format
- `toNewRecipient()`: Convert dashboard Recipient to new format
- `toDashboardRecipient()`: Convert new Recipient to dashboard format
- `initializeSaaSArchitecture()`: Initialize managers

## Updated Components

### Dashboard Context (`lib/kineet/dashboard-context.tsx`)

**New Features:**
- Integrated CampaignManager and QueueManager
- Added `updateCampaign()` and `deleteCampaign()` methods
- Exposed SaaS architecture managers for advanced usage

### New Campaign Panel V2 (`components/dashboard/new-campaign-panel-v2.tsx`)

**New Features:**
- Integrated ImportService for Excel/CSV import
- Variable personalization using MessageEngine
- Queue integration for non-blocking sending
- Pause/Resume capability
- Real-time progress tracking
- Campaign creation via CampaignManager

**To use:** Replace the import in `dashboard-app.tsx`:
```typescript
import { NewCampaignPanelV2 } from "./new-campaign-panel-v2";
// Then use <NewCampaignPanelV2 /> instead of <NewCampaignPanel />
```

### Settings Panel V2 (`components/dashboard/settings-panel-v2.tsx`)

**New Features:**
- Provider configuration (Email SMTP, WhatsApp, SMS)
- Connection testing
- Configuration validation
- Status indicators

**Tabs:**
- **Providers:** Configure Email, WhatsApp, SMS providers
- **Preferences:** Existing settings (notifications, dark mode, language)

**To use:** Replace the import in `dashboard-app.tsx`:
```typescript
import { SettingsPanelV2 } from "./settings-panel-v2";
// Then use <SettingsPanelV2 /> instead of <SettingsPanel />
```

## Campaign Lifecycle

1. **Draft**: Campaign created, not yet sent
2. **Queued**: Campaign queued for sending
3. **Sending**: Campaign is being processed by Queue Manager
4. **Paused**: Campaign paused (can be resumed)
5. **Completed**: All messages sent successfully
6. **Failed**: Campaign failed (can be retried)

## Recipient Status

- **waiting**: Waiting to be sent
- **sending**: Currently being sent
- **sent**: Successfully sent
- **failed**: Failed after max retries
- **skipped**: Skipped (duplicate, invalid, etc.)

## Variable System

Supported variables in message templates:
- `{{nom}}`: Recipient's last name
- `{{prenom}}`: Recipient's first name
- `{{entreprise}}`: Recipient's company
- `{{email}}`: Recipient's email
- `{{contact}}`: Recipient's contact (phone or email)

## Provider Configuration

### Email Provider

Required fields:
- Expediteur (sender name)
- AdresseEmail (email address)
- ServeurSmtp (SMTP server)
- Port (SMTP port)
- Utilisateur (SMTP username)
- MotDePasse (SMTP password)

Optional fields:
- Signature
- AdresseReponse (reply-to address)
- Sécurité (none/tls/ssl)

### WhatsApp Provider

Required fields:
- API Key
- Phone Number

Optional fields:
- Business ID

### SMS Provider

Required fields:
- API Key

Optional fields:
- Sender ID
- Gateway Type (api/android)
- Android Device ID (for Android gateway)

## Replacing Mock Providers

To replace mock providers with real implementations:

1. Create a new provider class implementing the appropriate interface
2. Update the `useProviders` hook to use your implementation

Example for Email:
```typescript
import { IEmailProvider } from '@/lib/providers';

class RealEmailProvider implements IEmailProvider {
  // Implement all interface methods
  async sendMessage(to: string, subject?: string, body?: string): Promise<MessageResult> {
    // Use your real email service (Nodemailer, SendGrid, etc.)
  }
}

// In useProviders hook:
const [emailProvider] = useState(() => new RealEmailProvider());
```

## Testing the Flow

1. **Import Recipients:**
   - Go to "Nouvelle campagne"
   - Select a channel
   - Go to "Destinataires" tab
   - Click "Import Excel"
   - Upload a CSV/XLSX file
   - Review preview and errors

2. **Create Message:**
   - Go to "Message" step
   - Enter message with variables: `Bonjour {{prenom}}, votre commande est prête.`
   - Preview with sample recipient

3. **Send Campaign:**
   - Review summary
   - Click "Envoyer"
   - Watch real-time progress
   - Test pause/resume

4. **View History:**
   - Go to "Historique"
   - Filter by channel/status
   - View campaign details

5. **Configure Providers:**
   - Go to "Paramètres"
   - Select "Fournisseurs" tab
   - Configure Email/WhatsApp/SMS
   - Test connections

## Design Preservation

**Important:** The existing design, colors, components, animations, illustrations, spacings, typography, transitions, effects, cards, and buttons have been preserved. Only the content and functionality have been modified.

## Next Steps for Production

1. **Replace Mock Providers:** Implement real provider integrations
2. **Add Persistence:** Store campaigns, configurations in database
3. **Add Authentication:** Secure the dashboard
4. **Add Rate Limiting:** Prevent abuse of sending services
5. **Add Webhooks:** Notify external systems of campaign events
6. **Add Analytics:** Track campaign performance metrics
7. **Add Templates:** Save and reuse message templates
8. **Add Scheduling:** Schedule campaigns for future sending
9. **Add A/B Testing:** Test different message variations
10. **Add Compliance**: GDPR, unsubscribe links, etc.

## File Structure

```
lib/
├── types/                    # Type definitions
│   ├── campaign.ts
│   ├── provider.ts
│   ├── queue.ts
│   ├── import.ts
│   ├── notifications.ts
│   └── index.ts
├── providers/                # Provider layer
│   ├── base-provider.ts
│   ├── email-provider.ts
│   ├── whatsapp-provider.ts
│   ├── sms-provider.ts
│   ├── mock/                # Mock implementations
│   │   ├── mock-email-provider.ts
│   │   ├── mock-whatsapp-provider.ts
│   │   ├── mock-sms-provider.ts
│   │   └── index.ts
│   └── index.ts
├── queue/                    # Queue manager
│   ├── queue-manager.ts
│   └── index.ts
├── campaign/                 # Campaign manager
│   ├── campaign-manager.ts
│   └── index.ts
├── message/                  # Message engine
│   ├── message-engine.ts
│   └── index.ts
├── import/                   # Import service
│   ├── import-service.ts
│   └── index.ts
├── hooks/                    # Custom hooks
│   ├── use-campaigns.ts
│   ├── use-queue.ts
│   ├── use-providers.ts
│   ├── use-notifications.ts
│   └── index.ts
├── integration/              # Integration layer
│   ├── dashboard-integration.ts
│   └── index.ts
└── kineet/                   # Existing dashboard code
    ├── dashboard-context.tsx (updated)
    ├── types.ts
    ├── data.ts
    └── ...

components/dashboard/
├── new-campaign-panel-v2.tsx  # New campaign panel with SaaS integration
├── settings-panel-v2.tsx      # Settings panel with provider configuration
├── dashboard-app.tsx
├── home-panel.tsx
├── history-panel.tsx
└── ...
```

## Summary

The Kineet platform now has a complete SaaS-ready architecture that:
- Separates concerns into distinct layers
- Provides abstraction for easy provider replacement
- Supports non-blocking queue processing
- Includes comprehensive validation and error handling
- Maintains the existing design and UX
- Is ready for real service integration

All mock implementations can be replaced with real providers without modifying the rest of the application.
