# MCP REST API Playground

## Overview

A comprehensive testing playground for the MCP REST API client, accessible at `/test/mcp-rest-api`. This page provides an interactive interface to test all 9 MCP tools plus the health check endpoint before fully integrating the REST client into the application.

## Features

### 🎯 Comprehensive Testing Interface
- **10 Tabs**: One for each API method (9 tools + health check)
- **Parameter Forms**: Input forms for each method's parameters
- **Real-Time Results**: Instant display of API responses
- **Error Handling**: Clear error messages and status codes
- **Rate Limit Tracking**: Visual display of rate limit information
- **Request Logging**: History of all requests with timing

### 🎨 UI Components Used
- **shadcn/ui**: Tabs, Cards, Buttons, Inputs, Labels, Alerts, Badges, ScrollArea
- **MagicUI**: MagicCard (hover effects), ShimmerButton (visual enhancement)
- **Icons**: Lucide React icons for visual clarity

### 📊 Result Display
- **Success/Error Badges**: Visual status indicators
- **Duration Tracking**: Request timing in milliseconds
- **Rate Limit Info**: Remaining requests, reset time, retry-after
- **Formatted JSON**: Pretty-printed JSON results with copy functionality
- **Scrollable Results**: Long responses are scrollable

### 🔧 Request Log
- **Last 50 Requests**: Keeps history of recent API calls
- **Tool Name**: Which API method was called
- **Duration**: How long each request took
- **Rate Limit Info**: Rate limit status for each request
- **Error Tracking**: Failed requests are logged with error messages
- **Timestamp**: When each request was made

## API Methods Tested

1. **Health Check** - Server status and available tools
2. **Get Available Pokémon** - Query draft pool with filters
3. **Get Draft Status** - Current draft session status
4. **Get Team Budget** - Team's draft budget information
5. **Get Team Picks** - All draft picks for a team
6. **Get Pokémon Types** - Type information for a Pokémon
7. **Get Smogon Meta** - Competitive meta data from Smogon
8. **Get Ability Mechanics** - Detailed ability mechanics
9. **Get Move Mechanics** - Detailed move mechanics
10. **Analyze Pick Value** - Analyze draft pick value

## Navigation

The playground is accessible via:
- **Desktop Navigation**: "API Playground" button in the main header
- **Mobile Navigation**: "REST API Playground" link in Resources dropdown
- **Direct URL**: `/test/mcp-rest-api`

## Usage

1. **Select a Tab**: Choose the API method you want to test
2. **Fill Parameters**: Enter required/optional parameters in the form
3. **Execute Test**: Click the "Test" button
4. **View Results**: See results, errors, rate limits, and timing in the right panel
5. **Review Log**: Check request history in the log panel

## Implementation Details

### File Structure
```
app/test/mcp-rest-api/page.tsx
```

### Key Features
- **Type-Safe**: Uses the `mcpClient` from `@/lib/mcp-rest-client`
- **Error Handling**: Catches `MCPApiError` and displays structured errors
- **Rate Limit Display**: Extracts and displays rate limit headers
- **Toast Notifications**: Success/error notifications using Sonner
- **Copy to Clipboard**: One-click copy of JSON results
- **Responsive Design**: Works on desktop and mobile

### State Management
- **Form States**: Separate state for each API method's parameters
- **Results State**: Stores test results keyed by method name
- **Request Log**: Array of request logs (max 50 entries)
- **Loading State**: Prevents multiple simultaneous requests

## Testing Checklist

- [x] Health check endpoint
- [x] Get available Pokémon with filters
- [x] Get draft status
- [x] Get team budget
- [x] Get team picks
- [x] Get Pokémon types
- [x] Get Smogon meta
- [x] Get ability mechanics
- [x] Get move mechanics
- [x] Analyze pick value
- [x] Error handling
- [x] Rate limit tracking
- [x] Request logging
- [x] Copy to clipboard
- [x] Mobile responsiveness

## Future Enhancements

- [ ] Save test configurations
- [ ] Export test results
- [ ] Batch testing
- [ ] Performance metrics
- [ ] Request/response comparison
- [ ] Mock data mode
- [ ] API documentation integration

## Related Documentation

- [OpenAPI Integration Report](./OPENAPI-INTEGRATION-FINAL-REPORT.md)
- [MCP REST Client Usage Examples](./MCP-REST-CLIENT-USAGE-EXAMPLES.md)
- [MCP Tool Call Debugging Guide](./MCP-TOOL-CALL-DEBUGGING-GUIDE.md)
