import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import pandas as pd
from binance.client import Client
import time
from datetime import datetime
import warnings

# ai_bot.py bağlantısı
try:
    from ai_bot import MainApp, COLORS
except ImportError:
    COLORS = {
        'bg': '#0f172a', 'panel': '#1e293b', 'fg': '#e2e8f0',
        'accent': '#3b82f6', 'green': '#22c55e', 'red': '#ef4444',
        'yellow': '#eab308', 'grid': '#334155', 'btn': '#2d3748'
    }
    MainApp = None

warnings.filterwarnings("ignore")

try:
    client = Client()
except:
    client = None

class LauncherApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 MASTER HUB & SCANNER")
        self.root.geometry("1150x750")
        self.root.configure(bg=COLORS['bg']) 
        
        self.all_scan_data = [] # Tüm tarama verilerini burada tutacağız (filtreleme için)
        
        self.setup_styles()
        self.setup_ui()
        self.is_scanning = False
        self.open_windows = [] 

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("Treeview", 
                        background=COLORS['panel'], 
                        foreground='white', 
                        fieldbackground=COLORS['panel'], 
                        rowheight=35,
                        font=('Arial', 11))
        style.configure("Treeview.Heading", 
                        background=COLORS['grid'], 
                        foreground='white', 
                        font=('Arial', 11, 'bold'))
        style.map("Treeview", background=[("selected", COLORS['accent'])])

    def setup_ui(self):
        # --- BAŞLIK ---
        header = tk.Frame(self.root, bg=COLORS['bg'], pady=15)
        header.pack(fill=tk.X, padx=15)
        
        tk.Label(header, text="KONTROL MERKEZİ", font=("Arial", 20, "bold"), bg=COLORS['bg'], fg=COLORS['accent']).pack(side=tk.LEFT)
        tk.Label(header, text="| Akıllı Tarayıcı & Yönetim", font=("Arial", 12), bg=COLORS['bg'], fg='gray').pack(side=tk.LEFT, padx=10)

        # --- KONTROL PANELİ (AYARLAR + FİLTRELER) ---
        ctrl_frame = tk.Frame(self.root, bg=COLORS['panel'], pady=10, padx=10)
        ctrl_frame.pack(fill=tk.X, padx=15, pady=5)

        # Sol taraf: Tarama Ayarları
        frame_settings = tk.Frame(ctrl_frame, bg=COLORS['panel'])
        frame_settings.pack(side=tk.LEFT)

        tk.Label(frame_settings, text="Zaman:", bg=COLORS['panel'], fg='white', font=('bold')).pack(side=tk.LEFT, padx=5)
        self.tf_var = tk.StringVar(value="4 Saat")
        ttk.Combobox(frame_settings, textvariable=self.tf_var, values=["15 Dakika", "1 Saat", "4 Saat", "1 Gün"], width=10, state="readonly").pack(side=tk.LEFT, padx=5)

        tk.Label(frame_settings, text="Limit:", bg=COLORS['panel'], fg='white', font=('bold')).pack(side=tk.LEFT, padx=5)
        self.limit_var = tk.StringVar(value="50")
        tk.Entry(frame_settings, textvariable=self.limit_var, width=5, justify='center').pack(side=tk.LEFT, padx=5)

        self.btn_scan = tk.Button(frame_settings, text="📡 TARA", command=self.start_scan, 
                                  bg=COLORS['green'], fg='white', font=('Arial', 10, 'bold'), padx=15)
        self.btn_scan.pack(side=tk.LEFT, padx=15)

        # Sağ Taraf: Filtreleme Butonları
        frame_filters = tk.Frame(ctrl_frame, bg=COLORS['panel'])
        frame_filters.pack(side=tk.RIGHT)
        
        tk.Label(frame_filters, text="🔍 Filtrele:", bg=COLORS['panel'], fg='gray').pack(side=tk.LEFT, padx=5)
        
        # Arama Kutusu
        self.search_var = tk.StringVar()
        self.search_var.trace("w", self.filter_data) # Yazıldıkça filtrele
        entry_search = tk.Entry(frame_filters, textvariable=self.search_var, width=10, bg=COLORS['grid'], fg='white')
        entry_search.pack(side=tk.LEFT, padx=5)
        
        # Butonlar
        tk.Button(frame_filters, text="TÜMÜ", command=lambda: self.apply_quick_filter("ALL"), 
                  bg=COLORS['grid'], fg='white', width=6).pack(side=tk.LEFT, padx=2)
        tk.Button(frame_filters, text="AL 🟢", command=lambda: self.apply_quick_filter("BUY"), 
                  bg=COLORS['grid'], fg=COLORS['green'], width=6).pack(side=tk.LEFT, padx=2)
        tk.Button(frame_filters, text="SAT 🔴", command=lambda: self.apply_quick_filter("SELL"), 
                  bg=COLORS['grid'], fg=COLORS['red'], width=6).pack(side=tk.LEFT, padx=2)

        # --- TABLO ---
        tree_frame = tk.Frame(self.root, bg=COLORS['panel'])
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)

        cols = ("Sembol", "Fiyat", "Değişim %", "RSI", "Hacim (M$)", "Sinyal")
        self.tree = ttk.Treeview(tree_frame, columns=cols, show="headings")
        
        # Sütun başlıklarını oluştur ve sıralama fonksiyonunu bağla
        for col in cols:
            self.tree.heading(col, text=col, command=lambda c=col: self.sort_treeview(c, False))
            if col == "Sinyal":
                self.tree.column(col, width=150, anchor="center")
            else:
                self.tree.column(col, width=100, anchor="center")
        
        sb = ttk.Scrollbar(tree_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        self.tree.pack(side="left", fill="both", expand=True)

        self.tree.tag_configure("buy", foreground=COLORS['green'])
        self.tree.tag_configure("sell", foreground=COLORS['red'])
        self.tree.tag_configure("neutral", foreground='white')
        
        self.tree.bind("<Double-1>", self.on_row_double_click)

        # --- LOG ---
        log_frame = tk.Frame(self.root, bg=COLORS['panel'], height=100)
        log_frame.pack(fill=tk.X, padx=15, pady=10)
        self.log_area = scrolledtext.ScrolledText(log_frame, height=6, bg='#111', fg='cyan', font=('Consolas', 9))
        self.log_area.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

    def log(self, msg):
        ts = datetime.now().strftime("%H:%M:%S")
        self.log_area.insert(tk.END, f"[{ts}] {msg}\n")
        self.log_area.see(tk.END)

    # --- SIRALAMA MANTIĞI ---
    def sort_treeview(self, col, reverse):
        # Ağaçtaki verileri çek
        l = [(self.tree.set(k, col), k) for k in self.tree.get_children('')]
        
        # Sayısal ve metinsel sıralama ayrımı
        try:
            # Temizlik (%, $, M gibi harfleri silip sayıya çevir)
            l.sort(key=lambda t: float(t[0].replace('%','').replace('$','').replace('M','').replace(' ','')), reverse=reverse)
        except ValueError:
            # Sayıya çevrilemezse string olarak sırala
            l.sort(key=lambda t: t[0], reverse=reverse)

        # Sıralanmış veriyi yerleştir
        for index, (val, k) in enumerate(l):
            self.tree.move(k, '', index)

        # Bir sonraki tıklamada tersine sıralasın
        self.tree.heading(col, command=lambda: self.sort_treeview(col, not reverse))

    # --- FİLTRELEME MANTIĞI ---
    def apply_quick_filter(self, filter_type):
        self.search_var.set("") # Arama kutusunu temizle
        
        # Önce tabloyu temizle
        for item in self.tree.get_children():
            self.tree.delete(item)
            
        filtered_items = []
        
        if filter_type == "ALL":
            filtered_items = self.all_scan_data
        elif filter_type == "BUY":
            filtered_items = [item for item in self.all_scan_data if item['tag'] == 'buy']
        elif filter_type == "SELL":
            filtered_items = [item for item in self.all_scan_data if item['tag'] == 'sell']
            
        # Filtrelenmiş veriyi bas
        for item in filtered_items:
            self.tree.insert("", "end", values=item['values'], tags=(item['tag'],))

    def filter_data(self, *args):
        search_term = self.search_var.get().upper()
        
        for item in self.tree.get_children():
            self.tree.delete(item)
            
        for item in self.all_scan_data:
            symbol = item['values'][0]
            if search_term in symbol:
                self.tree.insert("", "end", values=item['values'], tags=(item['tag'],))

    # --- TARAMA İŞLEMLERİ ---
    def start_scan(self):
        if self.is_scanning: return
        self.is_scanning = True
        self.btn_scan.config(state="disabled", text="⏳...")
        
        # Tabloyu ve hafızayı temizle
        for item in self.tree.get_children(): self.tree.delete(item)
        self.all_scan_data = []
        
        threading.Thread(target=self.run_scanner_thread, daemon=True).start()

    def get_binance_data(self, symbol, interval_str):
        interval_map = {"15 Dakika": Client.KLINE_INTERVAL_15MINUTE, "1 Saat": Client.KLINE_INTERVAL_1HOUR, "4 Saat": Client.KLINE_INTERVAL_4HOUR, "1 Gün": Client.KLINE_INTERVAL_1DAY}
        try:
            klines = client.get_klines(symbol=symbol, interval=interval_map[interval_str], limit=100)
            df = pd.DataFrame(klines, columns=['timestamp', 'open', 'high', 'low', 'close', 'vol', 'ct', 'qav', 'nt', 'tb', 'tq', 'i'])
            df['close'] = df['close'].astype(float)
            df['qav'] = df['qav'].astype(float)
            return df
        except: return None

    def calculate_rsi(self, df, period=14):
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs)).iloc[-1]

    def run_scanner_thread(self):
            global client # Global client değişkenini kullan
            
            # --- DÜZELTME: BAĞLANTI KONTROLÜ VE YENİDEN BAĞLANMA ---
            if client is None:
                self.log("⚠️ Binance bağlantısı yok, tekrar bağlanılıyor...")
                try:
                    client = Client()
                    self.log("✅ Binance bağlantısı sağlandı.")
                except Exception as e:
                    self.log(f"❌ BAĞLANTI HATASI: {e}")
                    self.log("Lütfen internetinizi kontrol edin veya VPN kullanıyorsanız kapatıp deneyin.")
                    self.is_scanning = False
                    self.root.after(0, lambda: self.btn_scan.config(state="normal", text="📡 TARA"))
                    return
            # -------------------------------------------------------

            try:
                try: limit = int(self.limit_var.get())
                except: limit = 50
                    
                self.log(f"En yüksek hacimli {limit} coin taranıyor...")
                
                # Veri çekme işlemi
                tickers = client.get_ticker()
                
                # Sadece USDT olanları filtrele (UP/DOWN coinleri hariç)
                usdt_tickers = [t for t in tickers if t['symbol'].endswith('USDT') and 'UP' not in t['symbol'] and 'DOWN' not in t['symbol']]
                
                # Hacme göre sırala
                sorted_tickers = sorted(usdt_tickers, key=lambda x: float(x['quoteVolume']), reverse=True)[:limit]
                
                for t in sorted_tickers:
                    # Eğer tarama durdurulursa veya pencere kapanırsa döngüden çık
                    if not self.is_scanning: break

                    sym = t['symbol']
                    price = float(t['lastPrice'])
                    chg = float(t['priceChangePercent'])
                    vol = float(t['quoteVolume']) / 1_000_000
                    
                    df = self.get_binance_data(sym, self.tf_var.get())
                    
                    if df is not None and len(df) > 20:
                        rsi = self.calculate_rsi(df)
                        
                        sig = "NÖTR"; tag = "neutral"
                        if rsi < 30: sig = "AŞIRI SATIM (AL)"; tag = "buy"
                        elif rsi > 70: sig = "AŞIRI ALIM (SAT)"; tag = "sell"
                        
                        val_tuple = (sym, f"{price}", f"%{chg:.2f}", f"{rsi:.1f}", f"${vol:.1f}M", sig)
                        
                        # Veriyi hafızaya kaydet
                        self.all_scan_data.append({'values': val_tuple, 'tag': tag})
                        
                        # Arayüze ekle
                        self.root.after(0, lambda v=val_tuple, t=tag: self.tree.insert("", "end", values=v, tags=(t,)))
                        
                        time.sleep(0.05)
                
                self.log("✅ Tarama bitti. Başlıklara tıklayarak sıralayabilirsiniz.")
            except Exception as e:
                self.log(f"Hata: {e}")
            finally:
                self.is_scanning = False
                self.root.after(0, lambda: self.btn_scan.config(state="normal", text="📡 TARA"))

    def on_row_double_click(self, event):
        selected_item = self.tree.selection()
        if not selected_item: return
        item = self.tree.item(selected_item)
        symbol = item['values'][0]
        self.open_trade_bot(symbol)

    def open_trade_bot(self, symbol):
        if MainApp is None:
            messagebox.showerror("Hata", "ai_bot.py bulunamadı.")
            return
        self.log(f"🚀 {symbol} için Yapay Zeka Botu başlatılıyor...")
        new_window = tk.Toplevel(self.root)
        new_window.title(f"AI ANALİZ - {symbol}")
        new_window.geometry("1400x900")
        try:
            app = MainApp(new_window)
            app.sym_var.set(symbol)
            new_window.after(500, lambda: self.auto_start_bot_analysis(app, symbol))
            self.open_windows.append(new_window)
        except Exception as e:
            messagebox.showerror("Hata", f"Bot başlatılamadı: {e}")

    def auto_start_bot_analysis(self, app_instance, symbol):
        try:
            app_instance.manual_analysis() 
            self.log(f"✅ {symbol} analiz ekranı açıldı.")
        except: pass

if __name__ == "__main__":
    root = tk.Tk()
    app = LauncherApp(root)
    root.mainloop()