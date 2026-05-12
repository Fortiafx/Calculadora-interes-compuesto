// src/app/api/forex/route.ts

import { NextResponse } from "next/server";

type PriceItem = {
  price: string;
  direction: "up" | "down" | "neutral";
  change: string;
};

const PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "NZDUSD",
  "USDCHF",
  "XAUUSD",
];

let lastPrices: Record<string, number> = {};

export async function GET() {
  try {
    const symbols = PAIRS.join(",");

    // 👉 API GRATIS (puedes cambiarla luego)
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=demo`,
      { cache: "no-store" }
    );

    if (!res.ok) throw new Error("API error");

    const data = await res.json();

    const prices: Record<string, PriceItem> = {};

    for (const item of data) {
      const pair = item.symbol;

      const formattedPair =
        pair === "XAUUSD"
          ? "XAU/USD"
          : `${pair.slice(0, 3)}/${pair.slice(3)}`;

      const current = Number(item.price);
      const prev = lastPrices[pair] ?? current;

      let direction: PriceItem["direction"] = "neutral";
      if (current > prev) direction = "up";
      else if (current < prev) direction = "down";

      const change = (current - prev).toFixed(5);

      prices[formattedPair] = {
        price: current.toFixed(5),
        direction,
        change,
      };

      lastPrices[pair] = current;
    }

    return NextResponse.json({
      prices,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Forex API error:", error);

    // 🔥 FALLBACK (para que NUNCA se rompa tu UI)
    return NextResponse.json({
      prices: {
        "EUR/USD": { price: "1.08450", direction: "neutral", change: "0.00000" },
        "GBP/USD": { price: "1.27300", direction: "neutral", change: "0.00000" },
        "USD/JPY": { price: "150.20000", direction: "neutral", change: "0.00000" },
        "AUD/USD": { price: "0.65800", direction: "neutral", change: "0.00000" },
        "USD/CAD": { price: "1.35000", direction: "neutral", change: "0.00000" },
        "NZD/USD": { price: "0.61200", direction: "neutral", change: "0.00000" },
        "USD/CHF": { price: "0.90200", direction: "neutral", change: "0.00000" },
        "XAU/USD": { price: "2300.00", direction: "neutral", change: "0.00000" },
      },
      timestamp: Date.now(),
      fallback: true,
    });
  }
}