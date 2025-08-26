# Payment Gateway Proxy with Gemini LLM Integration

## 1. Project Overview

This project is a **payment gateway proxy simulator** that demonstrates how to integrate Large Language Models (LLMs) into payment processing workflows. It's designed as a proof-of-concept for using AI to enhance fraud detection and provide human-readable explanations for payment routing decisions.

### What It Does

- **Payment Processing**: Simulates a payment gateway that processes charge requests
- **Fraud Detection**: Implements rule-based risk assessment with configurable fraud detection rules
- **LLM Integration**: Uses Google's Gemini AI to generate human-readable explanations for payment decisions
- **Smart Routing**: Automatically routes payments to different providers (Stripe/PayPal) based on risk scores
- **Transaction Management**: Stores and retrieves transaction data with comprehensive logging

### Key Features

- **Risk Assessment Engine**: Configurable fraud detection rules (amount thresholds, suspicious domains, email validation)
- **AI-Powered Explanations**: Gemini LLM generates natural language explanations for routing decisions
- **Provider Selection**: Intelligent routing between Stripe and PayPal based on risk tolerance
- **Caching Layer**: LLM responses are cached to reduce API calls and improve performance

## 2. Setup & Installation

### Prerequisites

- **Node.js 18+** (for modern ES features and TypeScript support)
- **npm or yarn** (package manager)
- **Google AI API key** for Gemini (free tier available)

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/prabhu118/payment-gateway-proxy.git
cd payment-gateway-proxy
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env
echo "PORT=3000" >> .env
echo "LOG_LEVEL=info" >> .env
```

4. **Get a Gemini API Key:**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key
   - Copy the key to your `.env` file


### Running the Application

#### Development Mode (with hot reload)
```bash
npm run dev
```
Uses `ts-node-dev` for automatic restarting on file changes.

#### Production Mode
```bash
npm run build
npm start
```

#### Docker (Alternative)
```bash
docker build -t payment-gateway-proxy .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key payment-gateway-proxy
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## 3. Usage

### API Endpoints

#### Payment Processing

**Process a payment:**
```bash
POST /charge
Content-Type: application/json

{
  "amount": 5000,
  "currency": "USD",
  "source": "tok_visa",
  "email": "user@example.com"
}
```

**Get all transactions:**
```bash
GET /transactions
```

**Get specific transaction:**
```bash
GET /transaction/:id
```

### How Fraud Detection Works

The system uses a **rule-based scoring system** with configurable weights:

1. **Large Amount Detection**: 
   - Amount > $50,000: +0.3 risk score
   - Amount > $100,000: +0.4 risk score

2. **Suspicious Domain Detection**:
   - Known suspicious domains (.ru, .tk, .ml, test.com): +0.4 risk score

3. **Email Validation**:
   - Invalid email format: +0.2 risk score

4. **Test Token Detection**:
   - Test payment tokens: +0.1 risk score

**Risk Score Thresholds:**
- **Stripe**: Max risk score 0.4
- **PayPal**: Max risk score 0.5

### How LLM Integration Works

The Gemini LLM is used to **explain routing decisions**, not to make them:

1. **Input**: Payment request, risk score, triggered rules, and routing decision
2. **Processing**: Gemini generates human-readable explanation of why the payment was routed as it was
3. **Output**: Natural language explanation that can be used for:
   - Customer communication
   - Compliance documentation
   - Audit trails
   - Support team reference

**Example LLM Response:**
```
"Payment routed to PayPal due to moderate risk factors: 
- Large transaction amount ($75,000) triggered risk scoring
- Email domain appears legitimate
- Overall risk score (0.3) within PayPal's acceptable threshold (0.5)"
```

## 4. Assumptions

### Design Assumptions

- **Mock Gateway**: This is a simulation, not a real payment processor
- **In-Memory Storage**: Transactions are stored in memory (not persistent database)
- **No Sensitive Data**: No real payment information is sent to the LLM
- **Rule-Based Logic**: Fraud detection uses predefined rules, not ML training

### Simplifications

- **No Real Payment Processing**: Simulates successful/failed responses
- **Basic Risk Scoring**: Simple additive scoring system
- **Limited Provider Support**: Only Stripe and PayPal routing
- **No Authentication**: No user authentication or API key validation
- **Basic Rate Limiting**: Basic rate limiting for demonstration

### LLM Usage Assumptions

- **Explanations Only**: LLM provides human-readable explanations, not decision-making
- **Cached Responses**: LLM responses are cached to reduce API costs
- **Fallback Mode**: System works without LLM (simulated responses)

## 5. Development Notes

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Project Structure

```
src/
├── controllers/          # Request handlers (payment, descriptions)
├── services/            # Business logic (risk assessment, LLM, routing)
├── config/              # Configuration (fraud rules, provider settings)
├── types/               # TypeScript type definitions
├── utils/               # Utility functions (logging, validation, helpers)
├── app.ts               # Express app configuration and routing
└── server.ts            # Server entry point
```

### Environment Variables

- `GEMINI_API_KEY`: Google AI API key (required for LLM features)
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging level (default: info)

### Gemini Model Configuration

- **Default Model**: `gemini-2.0-flash` (fast, cost-effective)
- **Alternative Models**: `gemini-1.5-pro`, `gemini-1.0-pro`
- **Fallback**: Simulated responses when LLM unavailable

## Example API Usage

### Process Payment with cURL

```bash
curl -X POST http://localhost:3000/charge \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 75000,
    "currency": "USD",
    "source": "tok_visa",
    "email": "customer@example.com"
  }'
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "transactionId": "uuid-here",
    "amount": 75000,
    "currency": "USD",
    "status": "processed",
    "provider": "paypal",
    "riskScore": 0.3,
    "triggeredRules": ["Large Amount"],
    "explanation": "Payment routed to PayPal due to moderate risk factors..."
  }
}
```
