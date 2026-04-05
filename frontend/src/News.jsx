import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, RefreshCw, Calendar, ArrowRight, Clock, Zap, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import api from './api';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';

const News = () => {
  const { user, toggleSubscription } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const sourceQuery = searchParams.get('source');
  
  const [sources, setSources] = useState([t('AllSources')]);
  const [activeSource, setActiveSource] = useState(sourceQuery || t('AllSources'));
  const [timeframe, setTimeframe] = useState(3); // Default 3 days
  
  const timeframes = [
    { label: language === 'TR' ? 'Bugün' : 'Today', value: 1 },
    { label: language === 'TR' ? '3 Gün' : '3 Days', value: 3 },
    { label: language === 'TR' ? '7 Gün' : '7 Days', value: 7 },
    { label: language === 'TR' ? '1 Ay' : '1 Month', value: 30 },
    { label: language === 'TR' ? '1 Yıl' : '1 Year', value: 365 }
  ];

  // Article Reader State
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleContent, setArticleContent] = useState("");
  const [articleLoading, setArticleLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState(null);

  useEffect(() => {
    fetchNews();
  }, [language, timeframe, selectedAssetSymbol]); 

  useEffect(() => {
    if (selectedAssetSymbol) {
        const listElement = document.getElementById('news-list-top');
        if (listElement) {
            listElement.scrollIntoView({ behavior: 'smooth' });
        }
    }
  }, [selectedAssetSymbol]);

  const handleSubscribe = async () => {
    const cost = 5; 
    const confirmMsg = language === 'TR' 
        ? `Haber bültenini aktif etmek üzeresiniz. Hesabınızdan hemen ${cost} kredi düşülecek ve her ay devam edecektir. Onaylıyor musunuz?`
        : `You are about to activate the newsletter. ${cost} credits will be deducted immediately and every month thereafter. Do you confirm?`;
    
    if (!window.confirm(confirmMsg)) return;

    setSubscribing(true);
    try {
        await toggleSubscription('newsletter', 'subscribe');
    } catch (e) {
        if (e.response?.status === 403) {
            alert(language === 'TR' ? 'Yetersiz kredi! Lütfen kredi yükleyin.' : 'Insufficient credits! Please buy more credits.');
        } else {
            alert(language === 'TR' ? 'Bir hata oluştu.' : 'An error occurred.');
        }
    } finally {
        setSubscribing(false);
    }
  };

  useEffect(() => {
    // Reset source filter to "All" when language changes to prevent mismatch
    if (!sourceQuery) {
        setActiveSource(t('AllSources'));
    } else {
        setActiveSource(sourceQuery);
    }
  }, [language, t, sourceQuery]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/market/news?lang=${language}&days=${timeframe}${selectedAssetSymbol ? `&symbol=${selectedAssetSymbol}` : ''}`);
      setNews(data);
      // Extract unique sources
      const uniqueSources = [t('AllSources'), ...new Set(data.map(item => item.sourceName || t('OtherSource')))];
      setSources(uniqueSources);
    } catch (e) {
      console.error('Error fetching news:', e);
      // Fallback data for demonstration
      const fallbackData = [
        {
          title: "Küresel Piyasalar Enflasyon Verisine Odaklandı",
          contentSnippet: "Yatırımcılar, merkez bankasının faiz kararlarını şekillendirecek olan kritik enflasyon verisi öncesinde temkinli bekleyişini sürdürüyor.",
          pubDate: new Date().toISOString(),
          link: "#",
          importanceScore: 85,
          sourceName: 'System Fallback'
        }
      ];
      setNews(fallbackData);
      setSources([t('AllSources'), 'System Fallback']);
    } finally {
      setLoading(false);
    }
  };

  const handleReadArticle = async (item) => {
    setSelectedArticle(item);
    setArticleContent("");
    setArticleLoading(true);
    try {
        const urlParams = new URLSearchParams({
            url: item.link,
            lang: language,
            title: item.title || '',
            snippet: item.contentSnippet || ''
        });
        const data = await api.get(`/market/read-article?${urlParams.toString()}`);
        setArticleContent(data.content || t('ArticleError'));
    } catch (e) {
        setArticleContent("Makale içeriği okunamadı veya bu kaynak bot erişimine izin vermiyor.");
    } finally {
        setArticleLoading(false);
    }
  };

  let filteredNews = activeSource === t('AllSources') 
    ? news 
    : news.filter(item => (item.sourceName || t('OtherSource')) === activeSource);

  if (selectedAssetSymbol) {
    const symbolToMatch = selectedAssetSymbol.toUpperCase();
    filteredNews = filteredNews.filter(item => {
        const hasImpact = item.impacts?.some(imp => imp.asset === selectedAssetSymbol);
        const inTitle = item.title?.toUpperCase().includes(symbolToMatch);
        const inSnippet = item.contentSnippet?.toUpperCase().includes(symbolToMatch);
        const inTags = item.tags?.toUpperCase().includes(symbolToMatch);
        return hasImpact || inTitle || inSnippet || inTags;
    });
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300 } }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat(language === 'TR' ? 'tr-TR' : 'en-US', { 
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).format(d);
  };

  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">{t('NewsTitle')}</h1>
          <p className="text-xs text-muted-foreground font-medium mt-1">{t('NewsDesc')}</p>
        </div>
        
        <button 
          onClick={fetchNews}
          disabled={loading}
          className="premium-button flex items-center space-x-2"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          <span className="uppercase tracking-widest text-xs font-black">{t('Refresh')}</span>
        </button>
      </header>

      {/* Sentiment Analysis Dashboard (Heatmap & Bar Charts) */}
      <SentimentAnalysis 
          days={timeframe} 
          selectedSymbol={selectedAssetSymbol} 
          onSelect={setSelectedAssetSymbol} 
      />

      <>
          {/* Filter Status & Timeframe Filter */}
          <div className="flex flex-col space-y-6">
            {selectedAssetSymbol && (
              <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/30 rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.1)]">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Zap size={16} className="text-primary animate-pulse" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block">AKTİF FİLTRE</span>
                        <span className="text-sm font-black uppercase tracking-tight">
                            {selectedAssetSymbol} HABERLERİ
                        </span>
                    </div>
                </div>
                <button 
                    onClick={() => setSelectedAssetSymbol(null)}
                    className="text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 px-6 py-2 rounded-xl transition-all shadow-lg"
                >
                    {language === 'TR' ? 'FİLTREYİ TEMİZLE' : 'CLEAR FILTER'}
                </button>
              </div>
            )}

            <div className="flex items-center space-x-4 mb-2">
               <Clock size={16} className="text-primary" />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{language === 'TR' ? 'Tarih Filtresi' : 'Date Filter'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {timeframes.map(tf => (
                    <button
                        key={tf.value}
                        onClick={() => setTimeframe(tf.value)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            timeframe === tf.value 
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                : 'bg-secondary/20 text-muted-foreground border border-border/50 hover:bg-secondary/40'
                        }`}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            {/* Source Filter */}
            {sources.length > 1 && (
              <div className="flex overflow-x-auto pb-6 space-x-3 scrollbar-hide">
                  {sources.map(source => (
                      <button
                          key={source}
                          onClick={() => setActiveSource(source)}
                          className={`whitespace-nowrap px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                              activeSource === source 
                                  ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                                  : 'bg-secondary/30 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-border/50'
                          }`}
                      >
                          {source}
                      </button>
                  ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
                <RefreshCw className="animate-spin text-primary/30" size={48} />
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="glass-card p-20 text-center flex flex-col items-center space-y-4 border-dashed border-border/50">
                <Newspaper className="text-muted-foreground/20 w-16 h-16" />
                <p className="text-muted-foreground font-black uppercase tracking-widest italic opacity-30 text-xs">{t('NoNews')}</p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredNews.map((item, idx) => (
                <motion.div 
                    variants={itemVariants}
                    key={idx} 
                    className="glass-card p-6 flex flex-col group hover:-translate-y-2 transition-all duration-500 hover:shadow-xl hover:border-primary/30 relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-secondary/50 rounded-lg flex items-center justify-center border border-border group-hover:border-primary/30 transition-all text-primary/70 group-hover:text-primary">
                        <Newspaper size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-widest text-primary mb-1">
                            {item.sourceName || t('OtherSource')}
                        </span>
                        <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <Calendar size={10} />
                            <span>{formatDate(item.pubDate)}</span>
                        </div>
                    </div>
                    
                    <div className="ml-auto self-start flex items-center space-x-2">
                        <div className={`
                            flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-dashed
                            ${item.importanceScore >= 80 ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 
                              item.importanceScore >= 60 ? 'bg-primary/10 border-primary/30 text-primary' : 
                              'bg-secondary/50 border-border text-muted-foreground'}
                        `}>
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                item.importanceScore >= 80 ? 'bg-rose-500' : 
                                item.importanceScore >= 60 ? 'bg-primary' : 'bg-muted-foreground'
                            }`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {language === 'TR' ? 'ÖNEM:' : 'SCORE:'} {item.importanceScore || 50}
                            </span>
                        </div>
                        {/* Visual Flags for Database Verification - Made much more obvious */}
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg border-2 transition-all duration-300
                            ${item.isTranslated 
                                ? 'bg-rose-600/20 border-rose-500 shadow-rose-500/20 animate-pulse' 
                                : 'bg-blue-600/20 border-blue-500 shadow-blue-500/20'}
                        `} title={item.isTranslated ? "Database: Translated (TR)" : "Database: Original (EN)"}>
                            {item.isTranslated ? '🇹🇷' : '🇬🇧'}
                        </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold leading-snug mb-4 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  
                  {/* Impact Indicators */}
                  {item.impacts && item.impacts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                          {item.impacts.map((impact, i) => (
                              <button 
                                  key={i} 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAssetSymbol(impact.asset);
                                  }}
                                  className={`
                                  flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all hover:scale-105 active:scale-95
                                  ${impact.direction === 'POSITIVE' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'}
                              `}>
                                  <span className="tracking-widest">{impact.asset}</span>
                                  <div className={`w-px h-2 ${impact.direction === 'POSITIVE' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`} />
                                  <span className="font-black">{impact.direction === 'POSITIVE' ? '+' : '-'}{impact.score}</span>
                              </button>
                          ))}
                      </div>
                  )}

                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 opacity-80 mb-8 line-clamp-3">
                    {item.contentSnippet || t('NoSnippet')}
                  </p>

                  <div className="pt-4 border-t border-border/50 mt-auto flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{t('AIRead')}</span>
                     <button 
                        onClick={() => handleReadArticle(item)}
                        className="flex items-center space-x-2 text-xs font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
                     >
                        <span>{t('GoToSource')}</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                     </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-4">
           <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col border border-border shadow-2xl rounded-3xl overflow-hidden relative"
           >
              <div className="flex items-center justify-between p-6 border-b border-border/50 bg-secondary/20">
                 <div className="flex items-center space-x-4">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                         <Newspaper size={20} />
                     </div>
                     <div>
                         <h2 className="text-xl font-black italic tracking-tighter line-clamp-1">{selectedArticle.title}</h2>
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{selectedArticle.sourceName}</p>
                     </div>
                 </div>
                 <button 
                    onClick={() => setSelectedArticle(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary/50 hover:bg-rose-500/20 hover:text-rose-500 transition-colors"
                 >
                    X
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {articleLoading ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-6">
                          <RefreshCw className="animate-spin text-primary/30" size={48} />
                          <div className="text-center">
                              <p className="text-lg font-black tracking-tighter">{language === 'TR' ? 'Yapay Zeka Okuyucu Devrede' : 'AI Reader Engaging'}</p>
                              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">{language === 'TR' ? 'Makale analiz edilip çevriliyor...' : 'Analyzing and translating article...'}</p>
                          </div>
                      </div>
                  ) : (
                       <div className="prose prose-invert max-w-none text-foreground prose-headings:font-black prose-headings:italic prose-a:text-primary">
                           {articleContent.split('\n\n').map((paragraph, i) => {
                               if (paragraph.startsWith('---')) return <hr key={i} className="border-border/30 my-8" />;
                               if (paragraph.startsWith('# ')) return <h2 key={i} className="text-2xl font-black italic text-primary mt-10 mb-6 uppercase tracking-tighter">{paragraph.replace('# ', '')}</h2>;
                               if (paragraph.startsWith('## ')) return <h3 key={i} className="text-lg font-black italic text-white/90 mt-8 mb-4 uppercase">{paragraph.replace('## ', '')}</h3>;
                               if (paragraph.startsWith('**')) {
                                   return <p key={i} className="font-bold text-primary mb-4">{paragraph.replace(/\*\*/g, '')}</p>;
                               }
                               if (paragraph.startsWith('- ')) {
                                   const items = paragraph.split('\n').filter(li => li.startsWith('- '));
                                   return (
                                       <ul key={i} className="space-y-3 mb-8">
                                           {items.map((li, idx) => (
                                               <li key={idx} className="flex items-start space-x-3 text-sm text-foreground/70">
                                                   <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                                                   <span>{li.replace('- ', '')}</span>
                                               </li>
                                           ))}
                                       </ul>
                                   );
                               }
                               return <p key={i} className="leading-relaxed text-sm lg:text-base text-foreground/80 mb-6">{paragraph}</p>;
                           })}
                       </div>
                  )}
              </div>
              <div className="p-4 border-t border-border/50 bg-secondary/10 flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('AIPoweredTranslation')}</span>
                   <a href={selectedArticle?.link} target="_blank" rel="noopener noreferrer" className="text-xs uppercase font-black tracking-widest text-primary hover:underline flex items-center space-x-2">
                       <span>{t('OpenOriginalArticle')}</span>
                       <ExternalLink size={14} />
                   </a>
               </div>
           </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const SentimentAnalysis = ({ days, selectedSymbol, onSelect }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSelectedAsset, setLocalSelectedAsset] = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    fetchSentiment();
  }, [days]);

  useEffect(() => {
    if (data.length > 0 && selectedSymbol) {
        const found = data.find(item => item.asset === selectedSymbol);
        if (found) setLocalSelectedAsset(found);
    }
  }, [selectedSymbol, data]);

  const fetchSentiment = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/market/news-sentiment-summary?days=${days}&t=${Date.now()}`);
      // Sort data by average score descending
      const sorted = [...res].sort((a, b) => b.averageScore - a.averageScore);
      setData(sorted);
      
      if (sorted.length > 0) {
        if (selectedSymbol) {
            const found = sorted.find(a => a.asset === selectedSymbol);
            if (found) setLocalSelectedAsset(found);
            else setLocalSelectedAsset(sorted[0]);
        } else if (!localSelectedAsset) {
            setLocalSelectedAsset(sorted[0]);
        }
      }
    } catch (e) {
      console.error('Sentiment fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (score) => {
    if (score >= 40) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 10) return 'text-emerald-400/80 bg-emerald-400/5 border-emerald-400/10';
    if (score <= -40) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (score <= -10) return 'text-rose-400/80 bg-rose-400/5 border-rose-400/10';
    return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  };

  if (loading && data.length === 0) return (
    <div className="glass-card p-8 animate-pulse flex flex-col space-y-4">
      <div className="h-6 w-48 bg-white/5 rounded" />
      <div className="flex space-x-3">
        {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-24 bg-white/5 rounded-xl" />)}
      </div>
    </div>
  );

  if (!loading && data.length === 0) return null;

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center space-x-2">
        <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
          <Zap size={16} className="text-primary" />
        </div>
        <h2 className="text-xl font-black uppercase italic tracking-tighter">
          {language === 'TR' ? 'Haber Duyarlılık Isı Haritası' : 'News Sentiment Heatmap'}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Breakdown Bar Chart - Moved to Top & Full Width */}
        {localSelectedAsset && (
          <div className="glass-card p-6 relative overflow-hidden group border-primary/20 shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <TrendingUp size={60} className={localSelectedAsset.averageScore >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
            </div>
            
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase mb-1">{localSelectedAsset.asset} {language === 'TR' ? 'Analizi' : 'Analysis'}</h3>
                <p className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">
                  {localSelectedAsset.totalCount} {language === 'TR' ? 'Haber Kaynağı' : 'News Sources'}
                </p>
              </div>
              <div className={`text-3xl font-black italic tracking-tighter ${localSelectedAsset.averageScore >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                %{localSelectedAsset.averageScore}
              </div>
            </div>

            <div className="space-y-4">
              {/* Average Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                  <span>{language === 'TR' ? 'GENEL ORTALAMA' : 'WEIGHTED AVERAGE'}</span>
                  <span className={localSelectedAsset.averageScore >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{localSelectedAsset.averageScore}%</span>
                </div>
                <div className="h-2.5 bg-secondary/50 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(localSelectedAsset.averageScore))}%` }}
                    className={`h-full ${localSelectedAsset.averageScore >= 0 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`}
                    style={{ marginLeft: localSelectedAsset.averageScore >= 0 ? '0' : 'auto' }}
                  />
                </div>
              </div>

              {/* Source Breakdown Bars - More compact grid */}
              <div className="pt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
                {localSelectedAsset.sources.map((src, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest opacity-70">
                      <span className="truncate pr-2">{src.name}</span>
                      <span className={src.avgScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{src.avgScore}%</span>
                    </div>
                    <div className="h-1 bg-secondary/30 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.abs(src.avgScore))}%` }}
                        className={`h-full ${src.avgScore >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Asset Heatmap Chips - Full Width Flex Wrap */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {data
              .filter(item => (!selectedSymbol || item.asset === selectedSymbol) && Math.abs(item.averageScore) >= 70)
              .map((item) => (
              <button
                key={item.asset}
                onClick={() => {
                   setLocalSelectedAsset(item);
                   onSelect(item.asset);
                }}
                className={`
                  px-3 py-1.5 rounded-xl border transition-all duration-300 flex items-center space-x-2
                  ${selectedSymbol === item.asset ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-lg' : 'hover:scale-102 opacity-80 hover:opacity-100'}
                  ${getColor(item.averageScore)}
                `}
              >
                <span className="text-xs font-black tracking-tighter">{item.asset}</span>
                <span className="text-[10px] font-bold opacity-70">{item.averageScore > 0 ? '+' : ''}{item.averageScore}%</span>
              </button>
            ))}
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 italic">
            {language === 'TR' ? '* Son 7 günlük haber etki analizi ortalaması' : '* Avg of last 7 days news impact analysis'}
          </p>
        </div>
      </div>
    </motion.section>
  );
};

export default News;
