from fastapi import FastAPI, HTTPException
from typing import List
from defeatbeta_api.data.ticker import Ticker
import pandas as pd
from datetime import datetime

app = FastAPI()

@app.get("/api/stock/{symbol}")
async def get_stock_data(symbol: str):
    print(f"Received request for symbol: {symbol}")
    try:
        # Resolve symbol (ensure .NS for Indian stocks if needed)
        ticker_symbol = symbol if symbol.endswith(".NS") else f"{symbol}.NS"
        print(f"Fetching data for ticker: {ticker_symbol}")
        ticker = Ticker(ticker_symbol)
        
        # Fetch price data
        df = ticker.price()
        
        if df is None or df.empty:
            print(f"No data found for {ticker_symbol}")
            raise HTTPException(status_code=404, detail=f"No data found for symbol {ticker_symbol}")
        
        print(f"Data fetched successfully for {ticker_symbol}, rows: {len(df)}")
        
        # Transform to OHLC format expected by frontend
        ohlc_data = []
        for i, row in df.iterrows():
            try:
                # Handle possible nulls or different date formats
                date_val = row["report_date"]
                if isinstance(date_val, (datetime, pd.Timestamp)):
                    date_str = date_val.strftime("%Y-%m-%d")
                else:
                    date_str = str(date_val)
                
                ohlc_data.append({
                    "date": date_str,
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": int(row["volume"])
                })
            except Exception as transform_error:
                print(f"Error transforming row {i}: {transform_error}")
                continue
            
        print(f"Returning {len(ohlc_data)} rows for {ticker_symbol}")
        return ohlc_data
    except HTTPException as he:
        # Re-raise HTTPExceptions (like the 404 we raise) so FastAPI handles them correctly
        raise he
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"CRITICAL ERROR fetching data for {symbol}:")
        print(error_detail)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
