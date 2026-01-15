
# NSE AlphaScreener

NSE AlphaScreener is a professional-grade stock scanner designed to identify institutional accumulation zones (Order Blocks) and explosive volatility contraction setups (VCP) in the Indian National Stock Exchange (NSE).

## ✨ Key Features
- **Dual Strategy Scanning**: Dedicated engines for Order Block (SMC) and VCP (Minervini-style) identification.
- **Real-Time Data**: Fetches 6 months of historical daily data from Yahoo Finance via a CORS proxy.
- **Smart Filtering**: Scan specific indices (Nifty 50, Next 50, Small Cap) or industries (Banking, IT, etc.).
- **AI-Powered Rationale (Optional)**: Uses Gemini 3 Flash to explain setups. Works even without an API key by disabling just this feature.
- **Fundamental Health Meter**: A proprietary proxy scoring system based on price trend stability and volume consistency.
- **Tag-Based Bookmarking**: Save stocks and organize them with custom categories (e.g., "High Conviction", "Watch List").

## 🛠️ Tech Stack
- **Frontend**: React (ES Modules), Tailwind CSS, Recharts.
- **API**: Google Gemini API (GenAI SDK) for optional insights.
- **Data Source**: Yahoo Finance Public API (v8).
- **Proxy**: AllOrigins (CORS bypass).

## 🚀 Local Setup & Run

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- A modern web browser.
- **(Optional)** A Google Gemini API Key (Get one at [aistudio.google.com](https://aistudio.google.com/)).

### Installation
1. Clone or download this project.
2. Open your terminal in the project root directory.
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the App
1. **(Optional)** Set your Gemini API key environment variable:
   ```bash
   # Linux/Mac
   export API_KEY=your_key_here
   # Windows
   set API_KEY=your_key_here
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000`.

## 📂 Project Structure
- `App.tsx`: Main application logic, filtering, and UI.
- `utils/analysis.ts`: Detection algorithms (OB/VCP) and scoring.
- `services/geminiService.ts`: Optional AI interpretation logic.
- `components/StockChart.tsx`: Recharts visualization of OHLC and Order Blocks.
