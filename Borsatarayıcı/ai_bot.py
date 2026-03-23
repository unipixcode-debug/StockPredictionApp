import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext, Menu
import threading
import time
import requests
from binance.client import Client
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
import matplotlib.dates as mdates
import numpy as np
import json
import os
import sqlite3
import feedparser
from textblob import TextBlob
from datetime import datetime, timedelta
import warnings
import re
import urllib.parse

warnings.filterwarnings("ignore")

# --- AYARLAR ---
OLLAMA_MODEL = "deepseek-v3.1:671b-cloud" 
OLLAMA_API_URL = "http://localhost:11434/api/generate"

# WhatsApp Ayarları
WHATSAPP_PHONE = "+905xxxxxxxxx" 
WHATSAPP_API_KEY = "123456"      

# --- RENK PALETİ ---
COLORS = {
    'bg': '#0f172a', 'panel': '#1e293b', 'fg': '#e2e8f0',
    'accent': '#3b82f6', 'green': '#22c55e', 'red': '#ef4444',
    'yellow': '#eab308', 'grid': '#334155', 
    'candle_up': '#089981', 'candle_down': '#f23645',
    'toolbar_bg': '#f0f0f0', 'info': '#0ea5e9',
    'tp_line': '#00ff00', 'sl_line': '#ff0000', 'entry_line': '#0088ff', 'curr_line': '#ffffff',
    'fav_bg': '#162032', 'fav_btn': '#2d3748' # Favori paneli renkleri
}

print("🚀 AI TRADING MASTER BOT v11 (FAVORITES/WATCHLIST) BAŞLATILIYOR...")

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer): return int(obj)
        if isinstance(obj, np.floating): return float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

# --- FAVORİ YÖNETİCİSİ (YENİ) ---
class FavoritesManager:
    def __init__(self):
        self.file = "favorites.json"
        self.items = self.load()

    def load(self):
        if not os.path.exists(self.file):
            return ["BTCUSDT", "ETHUSDT"] # Varsayılanlar
        try:
            with open(self.file, 'r') as f: return json.load(f)
        except: return []

    def save(self):
        with open(self.file, 'w') as f: json.dump(self.items, f)

    def add(self, symbol):
        if symbol not in self.items:
            self.items.append(symbol)
            self.save()
            return True
        return False

    def remove(self, symbol):
        if symbol in self.items:
            self.items.remove(symbol)
            self.save()
            return True
        return False

# --- WHATSAPP ---
class WhatsAppManager:
    def __init__(self):
        self.phone = WHATSAPP_PHONE
        self.apikey = WHATSAPP_API_KEY
        self.base_url = "https://api.callmebot.com/whatsapp.php"

    def send_message(self, message):
        if "xxxx" in self.phone: return
        try:
            text = urllib.parse.quote(message)
            url = f"{self.base_url}?phone={self.phone}&text={text}&apikey={self.apikey}"
            requests.get(url, timeout=10)
        except: pass

# --- İŞLEM YÖNETİCİSİ ---
class TradeManager:
    def __init__(self, notifier):
        self.active_file = "active_trades.json"
        self.history_file = "trade_history.json"
        self.notifier = notifier
        self.load_data()

    def load_data(self):
        if not os.path.exists(self.active_file):
            with open(self.active_file, 'w') as f: json.dump({}, f)
        if not os.path.exists(self.history_file):
            with open(self.history_file, 'w') as f: json.dump([], f)
            
        with open(self.active_file, 'r') as f: self.active_trades = json.load(f)
        with open(self.history_file, 'r') as f: self.history = json.load(f)

    def save_data(self):
        with open(self.active_file, 'w') as f: json.dump(self.active_trades, f, indent=2, cls=NumpyEncoder)
        with open(self.history_file, 'w') as f: json.dump(self.history, f, indent=2, cls=NumpyEncoder)

    def get_active_trade(self, symbol):
        return self.active_trades.get(symbol)

    def open_trade(self, symbol, entry, tp, sl, decision, capital):
        if symbol in self.active_trades: return 
        
        trade_data = {
            "entry_time": datetime.now().isoformat(),
            "symbol": symbol, "type": decision, "entry_price": entry,
            "tp": tp, "sl": sl, "status": "OPEN", "capital": capital
        }
        self.active_trades[symbol] = trade_data
        self.save_data()
        
        msg = f"🚀 İŞLEM AÇILDI!\n{symbol} - {decision}\nGiriş: {entry}\nHedef: {tp}\nStop: {sl}"
        self.notifier.send_message(msg)

    def close_trade(self, symbol, exit_price, reason):
        if symbol not in self.active_trades: return None
        trade = self.active_trades.pop(symbol)
        
        trade["exit_time"] = datetime.now().isoformat()
        trade["exit_price"] = exit_price
        trade["reason"] = reason
        
        if trade["type"] == "AL":
            pnl_pct = ((exit_price - trade["entry_price"]) / trade["entry_price"]) * 100
        else:
            pnl_pct = ((trade["entry_price"] - exit_price) / trade["entry_price"]) * 100
            
        capital = float(trade.get("capital", 1000))
        real_profit = (pnl_pct / 100) * capital
        
        trade["pnl_pct"] = pnl_pct
        trade["real_profit"] = real_profit
        
        self.history.append(trade)
        self.save_data()
        
        msg = f"🏁 İŞLEM KAPANDI ({symbol})\nNeden: {reason}\nÇıkış: {exit_price}\nKar: ${real_profit:.2f}"
        self.notifier.send_message(msg)
        
        return pnl_pct, real_profit

    def delete_history_record(self, reverse_index):
        try:
            real_index = len(self.history) - 1 - reverse_index
            if 0 <= real_index < len(self.history):
                del self.history[real_index]
                self.save_data()
                return True
        except: pass
        return False

    def check_trade_status(self, symbol, current_price):
        if symbol not in self.active_trades: return None
        trade = self.active_trades[symbol]
        
        if trade["type"] == "AL":
            if current_price >= trade["tp"]: return self.close_trade(symbol, current_price, "TAKE_PROFIT ✅")
            if current_price <= trade["sl"]: return self.close_trade(symbol, current_price, "STOP_LOSS ❌")
        elif trade["type"] == "SAT":
            if current_price <= trade["tp"]: return self.close_trade(symbol, current_price, "TAKE_PROFIT ✅")
            if current_price >= trade["sl"]: return self.close_trade(symbol, current_price, "STOP_LOSS ❌")
        return None

# --- HABER MOTORU ---
class NewsEngine:
    def __init__(self):
        self.sources = [
            ('CoinTelegraph', 'https://cointelegraph.com/rss'),
            ('CryptoNews', 'https://cryptonews.com/news/feed'),
            ('GoogleNews', 'https://news.google.com/rss/search?q=crypto&hl=en-US&gl=US&ceid=US:en'),
            ('Investing', 'https://www.investing.com/rss/news_285.rss'),
            ('CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss'),
            ('Decrypt', 'https://decrypt.co/feed')
        ]
        self.news_cache = []

    def fetch_news(self):
        self.news_cache = []
        for src, url in self.sources:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:2]:
                    blob = TextBlob(entry.title)
                    score = 0
                    if blob.sentiment.polarity > 0.3: score = 2
                    elif blob.sentiment.polarity > 0: score = 1
                    elif blob.sentiment.polarity < -0.3: score = -2
                    elif blob.sentiment.polarity < 0: score = -1
                    self.news_cache.append({"source": src, "title": entry.title, "score": score, "time": datetime.now().strftime("%H:%M")})
            except: pass
        return len(self.news_cache)

    def get_summary(self):
        if not self.news_cache: return 0, []
        avg_score = sum(n['score'] for n in self.news_cache) / len(self.news_cache)
        return avg_score, self.news_cache

# --- MARKET VERİSİ ---
class MarketDataManager:
    def __init__(self):
        self.client = Client()
        self.all_symbols = []
        self.refresh_symbols()

    def refresh_symbols(self):
        try:
            info = self.client.get_exchange_info()
            self.all_symbols = sorted([s['symbol'] for s in info['symbols'] if s['status'] == 'TRADING' and 
                (s['symbol'].endswith('USDT') or s['symbol'].endswith('BTC') or s['symbol'].endswith('TRY'))])
        except: self.all_symbols = ["BTCUSDT", "ETHUSDT"]

    def get_current_price(self, symbol):
        try:
            ticker = self.client.get_symbol_ticker(symbol=symbol)
            return float(ticker['price'])
        except: return None

    def get_data(self, symbol, interval_str):
        interval_map = {"1 Dakika": Client.KLINE_INTERVAL_1MINUTE, "15 Dakika": Client.KLINE_INTERVAL_15MINUTE, "1 Saat": Client.KLINE_INTERVAL_1HOUR, "4 Saat": Client.KLINE_INTERVAL_4HOUR, "1 Gün": Client.KLINE_INTERVAL_1DAY, "1 Hafta": Client.KLINE_INTERVAL_1WEEK, "1 Ay": Client.KLINE_INTERVAL_1MONTH}
        try:
            klines = self.client.get_klines(symbol=symbol, interval=interval_map.get(interval_str, Client.KLINE_INTERVAL_15MINUTE), limit=200)
            df = pd.DataFrame(klines, columns=['timestamp','open','high','low','close','vol','ct','qav','nt','tb','tq','i'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            for c in ['open','high','low','close','vol']: df[c] = df[c].astype(float)
            
            df['RSI'] = 100 - (100 / (1 + df['close'].diff().where(lambda x: x>0, 0).rolling(14).mean() / df['close'].diff().where(lambda x: x<0, 0).abs().rolling(14).mean()))
            df['EMA50'] = df['close'].ewm(span=50).mean()
            df['EMA200'] = df['close'].ewm(span=200).mean()
            
            exp1 = df['close'].ewm(span=12).mean()
            exp2 = df['close'].ewm(span=26).mean()
            df['MACD'] = exp1 - exp2
            df['Signal'] = df['MACD'].ewm(span=9).mean()
            
            sma = df['close'].rolling(20).mean()
            std = df['close'].rolling(20).std()
            df['BB_Upper'] = sma + (std * 2)
            df['BB_Lower'] = sma - (std * 2)
            return df
        except: return None

class PatternDetector:
    def detect(self, df):
        patterns = []
        for i in range(len(df) - 5, len(df)):
            if i < 1: continue
            curr = df.iloc[i]
            prev = df.iloc[i-1]
            body = abs(curr['close'] - curr['open'])
            full = curr['high'] - curr['low']
            if full == 0: continue
            
            if body <= full * 0.1: patterns.append((curr['timestamp'], curr['high'], "Doji", "🟡"))
            if (min(curr['close'], curr['open']) - curr['low']) > body * 2: patterns.append((curr['timestamp'], curr['low'], "Hammer", "🔨"))
            if prev['close'] < prev['open'] and curr['close'] > curr['open'] and curr['close'] > prev['open'] and curr['open'] < prev['close']:
                patterns.append((curr['timestamp'], curr['high'], "Engulfing", "🚀"))
        return patterns

class AIEngine:
    def generate_prompt(self, symbol, df, sentiment_score, active_trade):
        row = df.iloc[-1]
        status_text = "Şu an işlemde değilsin. Yeni fırsat ara."
        if active_trade:
            status_text = f"DİKKAT: AÇIK İŞLEM VAR! Yön: {active_trade['type']}, Giriş: {active_trade['entry_price']}, TP: {active_trade['tp']}, SL: {active_trade['sl']}. Mevcut durumu yönet."

        return f"""
        Sen Profesyonel Kripto Botusun.
        [DURUM]: {status_text}
        [VERİ]: {symbol} | Fiyat: {row['close']} | RSI: {row['RSI']:.2f} | MACD: {row['MACD']:.4f} | Haber Skoru: {sentiment_score:.2f}
        [GÖREV]: Eğer açık işlem varsa yönet. Yoksa yeni fırsat ara.
        [FORMAT]:
        | Karar | Giriş Seviyesi | Hedef (TP) | Stop (SL) | Risk |
        | AL/SAT/BEKLE | {row['close']} | ... | ... | ... |
        """

    def query(self, prompt):
        try:
            res = requests.post(OLLAMA_API_URL, json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False})
            return res.json().get('response', 'Hata')
        except: return "Bağlantı Hatası"

# --- MAIN APP ---
class MainApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AI MASTER TRADING BOT v11.0 (WATCHLIST)")
        self.root.geometry("1600x1000")
        self.root.configure(bg=COLORS['bg'])
        
        self.market = MarketDataManager()
        self.news = NewsEngine()
        self.whatsapp = WhatsAppManager()
        self.trader = TradeManager(self.whatsapp)
        self.fav_mgr = FavoritesManager()
        self.ai = AIEngine()
        self.patterns = PatternDetector()
        
        self.auto_job = None
        self.chart_job = None
        self.fig = None; self.ax1 = None; self.ax2 = None; self.ax3 = None
        
        self.setup_ui()
        threading.Thread(target=self.news.fetch_news, daemon=True).start()

    def setup_ui(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background=COLORS['bg'])
        style.configure("TNotebook", background=COLORS['panel'], borderwidth=0)
        style.configure("TNotebook.Tab", background=COLORS['panel'], foreground='white', padding=[10,5])
        style.map("TNotebook.Tab", background=[("selected", COLORS['accent'])])
        style.configure("Treeview", background=COLORS['panel'], foreground='white', fieldbackground=COLORS['panel'])
        style.configure("Treeview.Heading", background=COLORS['grid'], foreground='white')

        # ÜST BAR (Aynı)
        top = tk.Frame(self.root, bg=COLORS['panel'], height=70)
        top.pack(fill=tk.X, padx=5, pady=5)
        
        tk.Label(top, text="AI MASTER BOT", font=('bold', 16), bg=COLORS['panel'], fg=COLORS['accent']).pack(side=tk.LEFT, padx=10)
        
        self.sym_var = tk.StringVar(value="BTCUSDT")
        cb_sym = ttk.Combobox(top, textvariable=self.sym_var, values=self.market.all_symbols, width=12)
        cb_sym.pack(side=tk.LEFT, padx=5)
        
        tk.Button(top, text="⭐ EKLE", command=self.add_favorite, bg=COLORS['yellow'], fg='black').pack(side=tk.LEFT, padx=2)
        
        self.tf_var = tk.StringVar(value="15 Dakika")
        ttk.Combobox(top, textvariable=self.tf_var, values=["1 Dakika", "15 Dakika", "1 Saat", "4 Saat", "1 Gün"], width=8).pack(side=tk.LEFT, padx=5)
        
        tk.Label(top, text="Yatırım ($):", bg=COLORS['panel'], fg='white').pack(side=tk.LEFT, padx=5)
        self.capital_var = tk.StringVar(value="1000")
        tk.Entry(top, textvariable=self.capital_var, width=8).pack(side=tk.LEFT, padx=5)

        self.chart_rate_var = tk.StringVar(value="5 sn")
        ttk.Combobox(top, textvariable=self.chart_rate_var, values=["1 sn", "5 sn", "10 sn", "30 sn"], width=5).pack(side=tk.LEFT, padx=5)
        
        self.ai_rate_var = tk.StringVar(value="15 dk")
        ttk.Combobox(top, textvariable=self.ai_rate_var, values=["1 dk", "5 dk", "15 dk", "1 Saat"], width=5).pack(side=tk.LEFT, padx=5)

        tk.Button(top, text="BAŞLAT (OTO)", command=self.start_auto, bg=COLORS['green'], fg='white').pack(side=tk.LEFT, padx=15)
        tk.Button(top, text="DURDUR", command=self.stop_auto, bg=COLORS['red'], fg='white').pack(side=tk.LEFT, padx=5)
        tk.Button(top, text="MANUEL ANALİZ", command=self.manual_analysis, bg=COLORS['info'], fg='white').pack(side=tk.LEFT, padx=5)
        tk.Button(top, text="ACİL SAT", command=self.close_current_position, bg=COLORS['red'], fg='white', font=('bold')).pack(side=tk.LEFT, padx=15)

        # --- ANA GÖVDE DÜZENİ ---
        main_frame = tk.Frame(self.root, bg=COLORS['bg'])
        main_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # 1. SOL PANEL: FAVORİLER (DARALTILDI: width=110)
        self.fav_frame = tk.Frame(main_frame, bg=COLORS['fav_bg'], width=110) 
        self.fav_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 5))
        # pack_propagate(False) ekleyerek içeriğin paneli genişletmesini engelliyoruz
        self.fav_frame.pack_propagate(False) 

        tk.Label(self.fav_frame, text="⭐ FAV", bg=COLORS['fav_bg'], fg='white', font=('bold', 10)).pack(pady=5)
        
        self.fav_canvas = tk.Canvas(self.fav_frame, bg=COLORS['fav_bg'], highlightthickness=0)
        self.fav_scrollbar = ttk.Scrollbar(self.fav_frame, orient="vertical", command=self.fav_canvas.yview)
        self.fav_scroll_frame = tk.Frame(self.fav_canvas, bg=COLORS['fav_bg'])
        
        self.fav_scroll_frame.bind("<Configure>", lambda e: self.fav_canvas.configure(scrollregion=self.fav_canvas.bbox("all")))
        self.fav_canvas.create_window((0, 0), window=self.fav_scroll_frame, anchor="nw", width=110) # Width burada da belirtildi
        self.fav_canvas.configure(yscrollcommand=self.fav_scrollbar.set)
        
        self.fav_canvas.pack(side="left", fill="both", expand=True)
        self.fav_scrollbar.pack(side="right", fill="y")
        
        self.refresh_favorites_ui()

        # 2. SAĞ PANEL: SPLIT (GRAFİK + LOGLAR)
        # Sashwidth artırarak ayırıcıyı belirginleştirdik
        split = tk.PanedWindow(main_frame, orient=tk.HORIZONTAL, bg=COLORS['bg'], sashwidth=6, sashrelief=tk.RAISED)
        split.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        self.chart_frame = tk.Frame(split, bg=COLORS['panel'])
        # stretch="always" ve weight ile orantı
        split.add(self.chart_frame, stretch="always", width=900) 
        self.init_chart()
        
        right_tabs = ttk.Notebook(split)
        # LOG BÖLÜMÜNÜ GENİŞLETTİK (width=600)
        split.add(right_tabs, width=600, stretch="always") 
        
        tab_log = tk.Frame(right_tabs, bg=COLORS['panel'])
        right_tabs.add(tab_log, text="📝 Log")
        self.log_area = scrolledtext.ScrolledText(tab_log, bg='#111', fg=COLORS['green'], font=('Consolas', 10))
        self.log_area.pack(fill=tk.BOTH, expand=True)
        
        tab_news = tk.Frame(right_tabs, bg=COLORS['panel'])
        right_tabs.add(tab_news, text="📰 Haberler")
        self.news_tree = ttk.Treeview(tab_news, columns=("Kaynak", "Puan", "Başlık"), show="headings")
        self.news_tree.heading("Kaynak", text="Kaynak"); self.news_tree.column("Kaynak", width=80)
        self.news_tree.heading("Puan", text="Puan"); self.news_tree.column("Puan", width=50)
        self.news_tree.heading("Başlık", text="Başlık")
        self.news_tree.pack(fill=tk.BOTH, expand=True)
        
        tab_active = tk.Frame(right_tabs, bg=COLORS['panel'])
        right_tabs.add(tab_active, text="⚡ Açık İşlemler")
        self.active_tree = ttk.Treeview(tab_active, columns=("Sembol", "Yön", "Giriş", "Hedef", "Stop"), show="headings")
        self.active_tree.heading("Sembol", text="Sembol")
        self.active_tree.heading("Yön", text="Yön")
        self.active_tree.heading("Giriş", text="Giriş")
        self.active_tree.heading("Hedef", text="Hedef")
        self.active_tree.heading("Stop", text="Stop")
        self.active_tree.pack(fill=tk.BOTH, expand=True)
        
        self.active_menu = Menu(self.root, tearoff=0)
        self.active_menu.add_command(label="POZİSYONU KAPAT", command=self.close_selected_active_trade)
        self.active_tree.bind("<Button-3>", self.show_active_menu)

        tab_hist = tk.Frame(right_tabs, bg=COLORS['panel'])
        right_tabs.add(tab_hist, text="📜 Geçmiş")
        self.hist_tree = ttk.Treeview(tab_hist, columns=("Tarih", "Sembol", "Yön", "Giriş", "Çıkış", "PnL", "Kar($)", "Neden"), show="headings")
        self.hist_tree.heading("Tarih", text="Tarih"); self.hist_tree.column("Tarih", width=70)
        self.hist_tree.heading("Sembol", text="Sembol"); self.hist_tree.column("Sembol", width=70)
        self.hist_tree.heading("Yön", text="Yön"); self.hist_tree.column("Yön", width=40)
        self.hist_tree.heading("Giriş", text="Giriş"); self.hist_tree.column("Giriş", width=70)
        self.hist_tree.heading("Çıkış", text="Çıkış"); self.hist_tree.column("Çıkış", width=70)
        self.hist_tree.heading("PnL", text="PnL %"); self.hist_tree.column("PnL", width=50)
        self.hist_tree.heading("Kar($)", text="Kar $"); self.hist_tree.column("Kar($)", width=60)
        self.hist_tree.heading("Neden", text="Neden")
        self.hist_tree.pack(fill=tk.BOTH, expand=True)
        
        self.hist_menu = Menu(self.root, tearoff=0)
        self.hist_menu.add_command(label="Seçileni Sil", command=self.delete_history_item)
        self.hist_tree.bind("<Button-3>", self.show_hist_menu)
        
        self.update_history_tab()
        self.update_active_tab()

    # --- FAVORİ İŞLEMLERİ ---
    def refresh_favorites_ui(self):
        for widget in self.fav_scroll_frame.winfo_children():
            widget.destroy()
            
        for sym in self.fav_mgr.items:
            btn_frame = tk.Frame(self.fav_scroll_frame, bg=COLORS['fav_bg'])
            btn_frame.pack(fill=tk.X, pady=1)
            
            btn = tk.Button(btn_frame, text=sym, bg=COLORS['fav_btn'], fg='white',
                            command=lambda s=sym: self.load_favorite(s), width=15)
            btn.pack(side=tk.LEFT, padx=2)
            
            # Sağ tık ile silme
            btn.bind("<Button-3>", lambda event, s=sym: self.delete_favorite(s))

    def add_favorite(self):
        sym = self.sym_var.get()
        if self.fav_mgr.add(sym):
            self.refresh_favorites_ui()
            messagebox.showinfo("Başarılı", f"{sym} favorilere eklendi.")

    def delete_favorite(self, symbol):
        if messagebox.askyesno("Sil", f"{symbol} favorilerden silinsin mi?"):
            self.fav_mgr.remove(symbol)
            self.refresh_favorites_ui()

    def load_favorite(self, symbol):
        self.sym_var.set(symbol)
        self.manual_analysis()

    # --- DİĞER FONKSİYONLAR (Öncekilerle Aynı) ---
    def init_chart(self):
        self.fig = plt.figure(figsize=(10, 8))
        gs = self.fig.add_gridspec(3, 1, height_ratios=[3, 1, 1], hspace=0.05)
        self.ax1 = self.fig.add_subplot(gs[0])
        self.ax2 = self.fig.add_subplot(gs[1], sharex=self.ax1)
        self.ax3 = self.fig.add_subplot(gs[2], sharex=self.ax1)
        self.fig.patch.set_facecolor(COLORS['bg'])
        for ax in [self.ax1, self.ax2, self.ax3]:
            ax.set_facecolor(COLORS['bg'])
            ax.tick_params(colors='white')
            ax.grid(True, color=COLORS['grid'], alpha=0.3)
        
        self.canvas = FigureCanvasTkAgg(self.fig, self.chart_frame)
        self.canvas.get_tk_widget().pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        
        tb_frame = tk.Frame(self.chart_frame, bg=COLORS['toolbar_bg'])
        tb_frame.pack(side=tk.BOTTOM, fill=tk.X)
        self.toolbar = NavigationToolbar2Tk(self.canvas, tb_frame)
        self.toolbar.config(background=COLORS['toolbar_bg'])
        self.toolbar.update()

    def log(self, msg):
        self.log_area.insert(tk.END, f"[{datetime.now().strftime('%H:%M')}] {msg}\n")
        self.log_area.see(tk.END)

    def update_news_tab(self, news_list):
        for i in self.news_tree.get_children(): self.news_tree.delete(i)
        for n in news_list: self.news_tree.insert("", "end", values=(n['source'], n['score'], n['title']))

    def update_active_tab(self):
        for i in self.active_tree.get_children(): self.active_tree.delete(i)
        for sym, t in self.trader.active_trades.items():
            self.active_tree.insert("", "end", values=(sym, t['type'], f"{t['entry_price']:.4f}", f"{t['tp']:.4f}", f"{t['sl']:.4f}"))

    def update_history_tab(self):
        for i in self.hist_tree.get_children(): self.hist_tree.delete(i)
        for h in self.trader.history[::-1]:
            tag = "win" if h['pnl_pct'] > 0 else "loss"
            self.hist_tree.insert("", "end", values=(
                h['exit_time'][:10], h['symbol'], h['type'], 
                f"{h['entry_price']:.4f}", f"{h['exit_price']:.4f}", 
                f"{h['pnl_pct']:.2f}", f"{h.get('real_profit', 0):.2f}", h['reason']
            ), tags=(tag,))
        self.hist_tree.tag_configure("win", foreground=COLORS['green'])
        self.hist_tree.tag_configure("loss", foreground=COLORS['red'])

    def show_hist_menu(self, event):
        try:
            self.hist_tree.selection_set(self.hist_tree.identify_row(event.y))
            self.hist_menu.tk_popup(event.x_root, event.y_root)
        finally: self.hist_menu.grab_release()

    def delete_history_item(self):
        selected_item = self.hist_tree.selection()
        if selected_item:
            index = self.hist_tree.index(selected_item)
            if self.trader.delete_history_record(index):
                self.update_history_tab()
                self.log("Kayıt silindi.")

    def show_active_menu(self, event):
        try:
            self.active_tree.selection_set(self.active_tree.identify_row(event.y))
            self.active_menu.tk_popup(event.x_root, event.y_root)
        finally: self.active_menu.grab_release()

    def close_selected_active_trade(self):
        selected = self.active_tree.selection()
        if not selected: return
        item = self.active_tree.item(selected)
        symbol = item['values'][0]
        self.perform_manual_close(symbol)

    def close_current_position(self):
        symbol = self.sym_var.get()
        self.perform_manual_close(symbol)

    def perform_manual_close(self, symbol):
        if not self.trader.get_active_trade(symbol):
            messagebox.showwarning("Uyarı", "Bu coin için açık işlem yok!")
            return
        current_price = self.market.get_current_price(symbol)
        if current_price:
            res = self.trader.close_trade(symbol, current_price, "MANUEL KAPAT ⚠️")
            self.log(f"{symbol} MANUEL KAPATILDI. PnL: {res[0]:.2f}%")
            self.update_active_tab()
            self.update_history_tab()
            self.update_chart_only()
        else:
            messagebox.showerror("Hata", "Fiyat alınamadı!")

    def start_auto(self):
        self.log("OTOMATİK MOD BAŞLATILDI.")
        self.chart_loop()
        self.ai_loop()

    def stop_auto(self):
        self.log("OTOMATİK MOD DURDURULDU.")
        if self.chart_job: self.root.after_cancel(self.chart_job)
        if self.auto_job: self.root.after_cancel(self.auto_job)

    def chart_loop(self):
        self.update_chart_only()
        sec = int(self.chart_rate_var.get().split()[0])
        self.chart_job = self.root.after(sec * 1000, self.chart_loop)

    def ai_loop(self):
        self.run_ai_analysis()
        mins = self.ai_rate_var.get().split()[0]
        ms = 60 * 1000 * (int(mins) if mins.isdigit() else 60)
        self.auto_job = self.root.after(ms, self.ai_loop)

    def manual_analysis(self):
        self.run_ai_analysis()

    def update_chart_only(self):
        sym = self.sym_var.get()
        df = self.market.get_data(sym, self.tf_var.get())
        if df is None: return
        
        curr = df['close'].iloc[-1]
        res = self.trader.check_trade_status(sym, curr)
        if res:
            self.log(f"İŞLEM KAPANDI! PnL: {res[0]:.2f}% (${res[1]:.2f})")
            self.update_history_tab()
            self.update_active_tab()
            
        patterns = self.patterns.detect(df)
        trade = self.trader.get_active_trade(sym)
        self.plot_chart(df, patterns, trade, sym)

    def run_ai_analysis(self):
        threading.Thread(target=self._ai_process, daemon=True).start()

    def _ai_process(self):
        sym = self.sym_var.get()
        df = self.market.get_data(sym, self.tf_var.get())
        if df is None: return
        
        sentiment, news_list = self.news.get_summary()
        self.root.after(0, lambda: self.update_news_tab(news_list))
        
        active_trade = self.trader.get_active_trade(sym)
        prompt = self.ai.generate_prompt(sym, df, sentiment, active_trade)
        
        self.log(f"AI Analiz Ediyor ({sym})...")
        resp = self.ai.query(prompt)
        
        match = re.search(r"\|\s*(AL|SAT)\s*\|\s*([\d\.]+)\s*\|\s*([\d\.]+)\s*\|\s*([\d\.]+)", resp)
        if match and not active_trade:
            dec, entry, tp, sl = match.groups()
            try: cap = float(self.capital_var.get())
            except: cap = 1000
            self.trader.open_trade(sym, float(entry), float(tp), float(sl), dec, cap)
            self.log(f"YENİ İŞLEM: {dec} (Hedef: {tp})")
            self.root.after(0, self.update_active_tab)
        
        self.root.after(0, lambda: self.log_area.insert(tk.END, f"\nAI RAPOR:\n{resp}\n{'-'*40}\n"))
        self.root.after(0, self.update_chart_only)

    def plot_chart(self, df, patterns, trade, title):
        self.ax1.clear(); self.ax2.clear(); self.ax3.clear()
        
        df['mdate'] = mdates.date2num(df['timestamp'])
        width = (df['mdate'].iloc[1] - df['mdate'].iloc[0]) * 0.8
        
        up = df[df.close >= df.open]
        down = df[df.close < df.open]
        
        self.ax1.bar(up.mdate, up.close-up.open, width, bottom=up.open, color=COLORS['candle_up'])
        self.ax1.vlines(up.mdate, up.low, up.high, color=COLORS['candle_up'])
        self.ax1.bar(down.mdate, down.close-down.open, width, bottom=down.open, color=COLORS['candle_down'])
        self.ax1.vlines(down.mdate, down.low, down.high, color=COLORS['candle_down'])
        
        self.ax1.plot(df['mdate'], df['BB_Upper'], color='white', alpha=0.2, linewidth=0.5)
        self.ax1.plot(df['mdate'], df['BB_Lower'], color='white', alpha=0.2, linewidth=0.5)
        self.ax1.plot(df['mdate'], df['EMA50'], color='cyan', alpha=0.5, linewidth=1)
        
        ld = df['mdate'].iloc[-1]
        curr_p = df['close'].iloc[-1]
        
        self.ax1.axhline(curr_p, color=COLORS['curr_line'], linestyle=':', linewidth=1)
        self.ax1.text(ld, curr_p, f" {curr_p:.4f}", color='white', va='center', fontsize=9, fontweight='bold', zorder=15)
        
        if trade:
            tp_price = trade['tp']
            entry_price = trade['entry_price']
            pnl_pct = abs((tp_price - entry_price) / entry_price * 100)
            
            self.ax1.axhline(tp_price, color=COLORS['tp_line'], linewidth=1.5, zorder=10)
            self.ax1.text(ld, tp_price, f" HEDEF: {tp_price:.4f} (+%{pnl_pct:.2f})", color=COLORS['tp_line'], va='bottom', fontweight='bold', fontsize=9, zorder=11)
            
            self.ax1.axhline(trade['sl'], color=COLORS['sl_line'], linewidth=1.5, zorder=10)
            self.ax1.text(ld, trade['sl'], f" STOP: {trade['sl']:.4f}", color=COLORS['sl_line'], va='top', fontweight='bold', fontsize=9, zorder=11)
            
            self.ax1.axhline(entry_price, color=COLORS['entry_line'], linestyle='--', linewidth=1.5, zorder=10)
            self.ax1.text(ld, entry_price, f" GİRİŞ: {entry_price:.4f}", color=COLORS['entry_line'], va='center', fontweight='bold', fontsize=9, zorder=11)

        for p in patterns:
            self.ax1.text(mdates.date2num(p[0]), p[1], p[3], color='yellow', fontsize=10, ha='center')

        self.ax1.set_title(f"{title} ANALİZİ", color='white', fontweight='bold')
        self.ax1.legend(facecolor=COLORS['panel'], labelcolor='white', loc='upper left')
        
        self.ax2.plot(df['mdate'], df['RSI'], color='orange', linewidth=1.5)
        self.ax2.axhline(70, color='red', linestyle='--', alpha=0.5)
        self.ax2.axhline(30, color='green', linestyle='--', alpha=0.5)
        self.ax2.set_ylabel('RSI', color='white')
        self.ax2.set_ylim(0, 100)
        
        self.ax3.plot(df['mdate'], df['MACD'], color='cyan', linewidth=1.5, label='MACD')
        self.ax3.plot(df['mdate'], df['Signal'], color='magenta', linewidth=1.5, label='Sig')
        colors = [COLORS['green'] if v >= 0 else COLORS['red'] for v in df['MACD'] - df['Signal']]
        self.ax3.bar(df['mdate'], df['MACD']-df['Signal'], width, color=colors, alpha=0.5)
        self.ax3.legend(loc='upper left', fontsize=8)
        
        self.ax1.xaxis.set_visible(False)
        self.ax2.xaxis.set_visible(False)
        self.ax3.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        
        self.fig.tight_layout()
        self.canvas.draw()

