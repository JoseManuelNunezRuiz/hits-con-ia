'use client';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Music, Loader2, Volume2, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function SunoMusicGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSongs, setGeneratedSongs] = useState([]);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [currentPaymentId, setCurrentPaymentId] = useState('');
  const audioRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Cargar canciones guardadas al iniciar
  useEffect(() => {
    loadSavedSongs();
    fetchGeneratedSongs();
    
    // Verificar pago solo si hay parámetros en la URL
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const payment_id = params.get('payment_id');
    const collection_status = params.get('collection_status');

    if (status === 'approved' || collection_status === 'approved') {
      checkPaymentStatus();
    }
  }, []);

  // Limpiar intervalos al desmontar el componente
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const loadSavedSongs = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('sunoSongs') || '[]');
      setGeneratedSongs(saved);
    } catch (error) {
      console.error('Error cargando canciones guardadas:', error);
    }
  };

  const fetchGeneratedSongs = async () => {
    try {
      const res = await fetch('/api/songs');
      if (!res.ok) throw new Error('Error al obtener canciones');
      const { songs: backendSongs } = await res.json();

      setGeneratedSongs(prevSongs => {
        const allIds = new Set(prevSongs.map(s => s.id));
        const newSongs = backendSongs.filter(s => !allIds.has(s.id));
        return [...newSongs, ...prevSongs];
      });
    } catch (error) {
      console.error(error);
    }
  };

  const saveSongsToStorage = (songs) => {
    try {
      localStorage.setItem('sunoSongs', JSON.stringify(songs));
      setSaveStatus('✅ Guardado');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error guardando canciones:', error);
      setSaveStatus('❌ Error al guardar');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  // Verificar estado del pago SOLO cuando hay parámetros en la URL
  const checkPaymentStatus = () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const payment_id = params.get('payment_id');
    const collection_status = params.get('collection_status');

    if (status === 'approved' || collection_status === 'approved') {
      setPaymentStatus('processing');
      setCurrentPaymentId(payment_id);
      setIsGenerating(true);
      startPolling(payment_id);
      
      // Limpiar parámetros de URL inmediatamente para evitar loops
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'rejected' || status === 'cancelled') {
      setPaymentStatus('error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // Polling con mejor control
  const startPolling = (payment_id) => {
    // Limpiar cualquier intervalo previo
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let pollCount = 0;
    const maxPolls = 100; // Máximo 5 minutos (3000ms * 100 = 300000ms)

    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      try {
        const response = await fetch(`/api/status?payment_id=${payment_id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.ready && data.url) {
          // Canción lista
          setDownloadUrl(data.url);
          setPaymentStatus('success');
          setIsGenerating(false);

          const newSong = {
            id: payment_id,
            title: data.title || `Canción generada`,
            prompt: data.prompt || 'Canción pagada',
            audioUrl: data.url,
            duration: data.duration || '3:24',
            createdAt: new Date().toLocaleString('es-ES'),
            isPaid: true
          };

          const updatedSongs = [newSong, ...generatedSongs];
          setGeneratedSongs(updatedSongs);
          saveSongsToStorage(updatedSongs);

          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        } else if (data.error || pollCount >= maxPolls) {
          // Error o timeout
          setPaymentStatus('error');
          setIsGenerating(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Si no está lista, continuar polling
      } catch (error) {
        console.error('Error verificando estado:', error);
        
        // En caso de error, detener después de varios intentos fallidos
        if (pollCount > 10) {
          setPaymentStatus('error');
          setIsGenerating(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 3000);

    // Timeout de seguridad
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        setPaymentStatus('error');
        setIsGenerating(false);
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }, 300000);
  };

  const handleGenerateAndPay = async () => {
    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error('No se pudo inicializar el pago');
      }
    } catch (error) {
      console.error('Error iniciando pago:', error);
      setPaymentStatus('error');
      setIsGenerating(false);
    }
  };

  const togglePlay = (song) => {
    if (currentPlaying === song.id) {
      audioRef.current?.pause();
      setCurrentPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = song.audioUrl;
        audioRef.current.play();
        setCurrentPlaying(song.id);
      }
    }
  };

  const downloadSong = (song) => {
    try {
      const a = document.createElement('a');
      a.href = song.audioUrl;
      a.download = `${song.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error descargando canción:', error);
    }
  };

  const handleAudioEnd = () => {
    setCurrentPlaying(null);
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'Pago confirmado. Generando tu canción...';
      case 'success':
        return '¡Canción lista! Ya puedes descargarla.';
      case 'error':
        return 'Hubo un problema con el pago o la generación.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-4">
              <Music className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Hits Con IA</h1>
          <p className="text-purple-200">Genera música profesional comercializable con IA</p>
        </div>

        {/* Payment Status */}
        {paymentStatus && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="text-white text-sm font-medium">
                  {getStatusMessage()}
                </p>
                {paymentStatus === 'processing' && (
                  <div className="mt-2 bg-white/20 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full animate-pulse w-3/4"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Download */}
        {downloadUrl && paymentStatus === 'success' && (
          <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-green-400/30">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">¡Tu canción está lista!</h3>
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg"
              >
                <Download className="w-5 h-5" />
                <span>Descargar Ahora</span>
              </a>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <label className="block text-white font-medium mb-3">
            Describe la música que quieres crear
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Una balada romántica en español con guitarra acústica y voz suave, tempo lento, con piano de fondo..."
            className="w-full bg-white/20 border border-white/30 rounded-xl p-4 text-white placeholder-purple-200 focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
            rows={4}
            disabled={isGenerating}
          />
          
          <div className="mt-4 p-4 bg-purple-600/20 rounded-xl border border-purple-400/30">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="w-5 h-5 text-purple-300" />
              <span className="text-purple-200 font-medium">Generación Premium</span>
            </div>
            <p className="text-purple-200 text-sm mb-3">
                • Calidad profesional 
                • Descarga inmediata 
                • Pago seguro con MercadoPago
            </p>
            <p className="text-white font-bold text-lg mb-3">$50 MXN por canción</p>
          </div>
          
          <button
            onClick={handleGenerateAndPay}
            disabled={isGenerating || !prompt.trim() || paymentStatus === 'processing'}
            className="w-full mt-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generando música...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Generar y Pagar</span>
              </>
            )}
          </button>
          
          {saveStatus && (
            <div className="mt-2 text-center text-sm text-green-300">
              {saveStatus}
            </div>
          )}
        </div>

        {/* Generated Songs List */}
        {generatedSongs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Volume2 className="w-5 h-5" />
              <span>Tus canciones</span>
            </h2>
            
            {generatedSongs.map((song) => (
              <div key={song.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-medium text-sm truncate">
                        {song.title}
                      </h3>
                      {song.isPaid && (
                        <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full border border-green-400/30">
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-purple-200 text-xs">
                      {song.createdAt} • {song.duration}
                    </p>
                  </div>
                </div>
                
                <p className="text-purple-200 text-xs mb-4 italic">
                  &ldquo;{song.prompt}&rdquo;
                </p>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => togglePlay(song)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    {currentPlaying === song.id ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {currentPlaying === song.id ? 'Pausar' : 'Reproducir'}
                    </span>
                  </button>
                  
                  <button
                    onClick={() => downloadSong(song)}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                    title="Descargar canción"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {generatedSongs.length === 0 && !isGenerating && !paymentStatus && (
          <div className="text-center py-12">
            <div className="bg-white/5 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Music className="w-8 h-8 text-purple-300" />
            </div>
            <p className="text-purple-200 mb-2">
                Calidad profesional con pago seguro vía MercadoPago
            </p>
          </div>
        )}

        <audio
          ref={audioRef}
          onEnded={handleAudioEnd}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}