import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, RefreshCw, Calendar, ArrowRight, Clock, Zap, Coins } from 'lucide-react';
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
  const [timeframe, setTimeframe] = useState(7); // Default 7 days
  
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

  useEffect(() => {
    if (user?.newsletterSubscribed || user?.role === 'admin' || user?.role === 'developer') {
        fetchNews();
    } else {
        setLoading(false);
    }
  }, [language, user?.newsletterSubscribed, timeframe]); 

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
      const data = await api.get(`/market/news?lang=${language}&days=${timeframe}`);
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

  const filteredNews = activeSource === t('AllSources') 
    ? news 
    : news.filter(item => (item.sourceName || t('OtherSource')) === activeSource);

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
        className="space-y-12 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">{t('NewsTitle')}</h1>
          <p className="text-muted-foreground font-medium mt-1">{t('NewsDesc')}</p>
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

      {!(user?.newsletterSubscribed || user?.role === 'admin' || user?.role === 'developer') ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-8 border-primary/20 bg-primary/5 max-w-2xl w-full"
          >
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(0,242,254,0.1)]">
                  <Newspaper className="text-primary" size={40} />
              </div>
              <div className="max-w-md">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">
                      {language === 'TR' ? 'Haber Analizini Aktif Et' : 'Activate News Analysis'}
                  </h2>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                      {language === 'TR' 
                          ? 'Yapay zeka destekli piyasa haberleri ve önem puanlaması özelliğini kullanmak için bültene abone olun.' 
                          : 'Subscribe to our newsletter to use AI-powered market news and importance scoring feature.'}
                  </p>
                  <div className="mt-6 inline-flex items-center space-x-2 px-4 py-2 bg-secondary/50 rounded-full border border-border">
                      <Coins className="text-primary" size={16} />
                      <span className="text-sm font-black tracking-tight text-foreground">
                          5 {language === 'TR' ? 'Kredi / Ay' : 'Credits / Month'}
                      </span>
                  </div>
              </div>
              <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="premium-button px-12 py-4 text-lg group overflow-hidden"
              >
                  <span className="relative z-10 flex items-center space-x-3">
                      {subscribing ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} fill="currentColor" />}
                      <span>{language === 'TR' ? 'HEMEN AKTİF ET' : 'ACTIVATE NOW'}</span>
                  </span>
              </button>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
                  {language === 'TR' ? 'İstediğiniz zaman iptal edebilirsiniz.' : 'Cancel anytime.'}
              </p>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Timeframe Filter */}
          <div className="flex flex-col space-y-6">
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
                    className="glass-card p-8 flex flex-col group hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:border-primary/30 relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-secondary/50 rounded-xl flex items-center justify-center border border-border group-hover:border-primary/30 transition-all text-primary/70 group-hover:text-primary">
                        <Newspaper size={18} />
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
      )}

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

export default News;
