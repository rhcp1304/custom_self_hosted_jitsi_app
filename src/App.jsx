import { useState, useEffect, useRef } from 'react';
import {
  MapPin, X, List, Plus, Play, Trash2, Loader2, Search, ChevronDown, AlertCircle, Monitor, ScreenShare,
} from 'lucide-react';

// --- INLINE UI COMPONENT REPLACEMENTS (Ensuring self-contained file) ---

// Simplified Button Component
const Button = ({ children, onClick, className = '', variant = 'default', size = 'default', disabled = false, title = '' }) => {
    // Reverting to stable, visible blue/gray colors
    let baseStyle = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none shadow-md';
    let variantStyle = '';
    let sizeStyle = '';

    switch (variant) {
        case 'ghost':
            variantStyle = 'bg-transparent hover:bg-gray-700/50';
            break;
        case 'outline':
            variantStyle = 'border border-blue-500 text-blue-500 hover:bg-blue-500/10';
            break;
        default:
            variantStyle = 'bg-blue-600 text-white hover:bg-blue-700'; // Default button is blue
    }

    switch (size) {
        case 'icon':
            sizeStyle = 'h-10 w-10 p-2';
            break;
        case 'sm':
            sizeStyle = 'h-9 px-3';
            break;
        default:
            sizeStyle = 'h-10 px-4 py-2';
    }

    return (
        <button
            onClick={onClick}
            className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
            disabled={disabled}
            title={title}
        >
            {children}
        </button>
    );
};

// Stub for EnhancedFreeMap
const EnhancedFreeMap = () => (
    <div className="p-4 flex items-center justify-center h-full bg-gray-900">
        <div className="text-center text-gray-400">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-lg font-medium">Map View</p>
            <p className="text-sm">Location services are active here.</p>
        </div>
    </div>
);

// --- MAIN APP COMPONENT ---

function App() {
  const [showMap, setShowMap] = useState(false);
  const [showCobrowsing, setShowCobrowsing] = useState(false);
  const [cobrowsingUrl, setCobrowsingUrl] = useState('https://www.google.com/search?q=Lenskart+Eyewear');
  const [cobrowsingInput, setCobrowsingInput] = useState('https://www.google.com/search?q=Lenskart+Eyewear');
  const [videoUrl, setVideoUrl] = useState('');
  const [isVideoSharing, setIsVideoSharing] = useState(false);
  const [currentSharedVideo, setCurrentSharedVideo] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [jitsiInitialized, setJitsiInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoadingVideoTitle, setIsLoadingVideoTitle] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [isPlaylistSynced, setIsPlaylistSynced] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const jitsiContainerRef = useRef(null);
  const [jitsiApi, setJitsiApi] = useState(null);
  const syncIntervalRef = useRef(null);
  const muteIntervalRef = useRef(null);

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const generateParticipantId = () => {
    return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const fetchYouTubeVideoTitle = async (videoUrl) => {
    try {
      const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`);
      if (response.ok) {
        const data = await response.json();
        return data.title || 'Unknown Video';
      }
    } catch (error) {
      console.error('Error fetching video title:', error);
    }
    return 'Unknown Video';
  };

  const storePlaylistLocally = (playlistData) => {
    const data = {
      playlist: playlistData,
      timestamp: Date.now(),
      participantId: participantId,
    };
    try {
        localStorage.setItem('jitsi_shared_playlist', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to store playlist locally.', e);
    }
  };

  const getLocalPlaylist = () => {
    try {
      const data = localStorage.getItem('jitsi_shared_playlist');
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error reading local playlist:', error);
    }
    return null;
  };

  const broadcastPlaylistUpdate = (action, data) => {
    if (!jitsiApi) return;
    const message = {
      type: 'PLAYLIST_SYNC',
      action: action,
      data: data,
      participantId: participantId,
      timestamp: Date.now(),
    };
    const jsonMessage = JSON.stringify(message);

    try {
      jitsiApi.executeCommand('sendEndpointTextMessage', '', jsonMessage);
    } catch (error) {
      console.log('Data channel failed, trying chat:', error);
      try {
        const chatMessage = `[PLAYLIST_SYNC] ${jsonMessage}`;
        jitsiApi.executeCommand('sendChatMessage', chatMessage);
      } catch (error) {
        console.log('Chat method also failed:', error);
      }
    }
    storePlaylistLocally(action === 'FULL_SYNC' ? data : playlist);
    setSyncStatus('syncing');
  };

  const handleIncomingMessage = (messageData) => {
    try {
      let message;
      if (typeof messageData === 'string') {
        if (messageData.startsWith('[PLAYLIST_SYNC]')) {
          message = JSON.parse(messageData.replace('[PLAYLIST_SYNC]', '').trim());
        } else {
          message = JSON.parse(messageData);
        }
      } else if (messageData.data) {
        if (messageData.data.startsWith('[PLAYLIST_SYNC]')) {
          message = JSON.parse(messageData.data.replace('[PLAYLIST_SYNC]', '').trim());
        } else {
          message = JSON.parse(messageData.data);
        }
      } else if (messageData.message) {
         if (messageData.message.startsWith('[PLAYLIST_SYNC]')) {
          message = JSON.parse(messageData.message.replace('[PLAYLIST_SYNC]', '').trim());
        } else {
            return;
        }
      } else {
        return;
      }

      if (message.participantId === participantId) return;

      if (message.type === 'PLAYLIST_SYNC') {
        switch (message.action) {
          case 'ADD':
            setPlaylist((prev) => {
              const exists = prev.find((video) => video.url === message.data.url);
              if (!exists) {
                const newPlaylist = [...prev, message.data];
                storePlaylistLocally(newPlaylist);
                return newPlaylist;
              }
              return prev;
            });
            break;
          case 'REMOVE':
            setPlaylist((prev) => {
              const newPlaylist = prev.filter((video) => video.id !== message.data.id);
              storePlaylistLocally(newPlaylist);
              return newPlaylist;
            });
            break;
          case 'FULL_SYNC':
            setPlaylist(message.data);
            storePlaylistLocally(message.data);
            break;
          case 'REORDER':
            setPlaylist(message.data);
            storePlaylistLocally(message.data);
            break;
          case 'REQUEST_SYNC':
              if (playlist.length > 0) {
                  broadcastPlaylistUpdate('FULL_SYNC', playlist);
              }
              break;
        }
        setIsPlaylistSynced(true);
        setSyncStatus('connected');
      }

    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  };

  const startPeriodicSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    syncIntervalRef.current = setInterval(() => {
      if (jitsiApi && participantId) {
        if (playlist.length === 0 || Date.now() - (getLocalPlaylist()?.timestamp || 0) > 60000) {
            broadcastPlaylistUpdate('REQUEST_SYNC', null);
        }

        const localData = getLocalPlaylist();
        if (localData && localData.participantId !== participantId) {
          const timeDiff = Date.now() - localData.timestamp;
          if (timeDiff < 10000) {
            setPlaylist(localData.playlist);
            setIsPlaylistSynced(true);
            setSyncStatus('connected');
          }
        }
      }
    }, 5000);
  };

  const muteJitsiSharedVideo = () => {
    try {
      const jitsiVideoContainer = jitsiContainerRef.current;
      if (!jitsiVideoContainer) return;

      const videoIframes = jitsiVideoContainer.querySelectorAll('iframe');
      videoIframes.forEach(iframe => {
        if (iframe.src.includes('youtube.com')) {
          iframe.muted = true;
          iframe.volume = 0;
          const message = JSON.stringify({ event: 'command', func: 'setVolume', args: [0] });
          iframe.contentWindow.postMessage(message, '*');
          const messageMute = JSON.stringify({ event: 'command', func: 'mute' });
          iframe.contentWindow.postMessage(messageMute, '*');
          setAudioMuted(true);
        }
      });

      const allVideos = jitsiVideoContainer.querySelectorAll('video');
      allVideos.forEach(element => {
        if (!element.muted) {
          element.muted = true;
          element.volume = 0;
        }
      });
    } catch (error) {
      console.error('Error muting shared video:', error);
    }
  };

  const stopMutingInterval = () => {
      if (muteIntervalRef.current) {
          clearInterval(muteIntervalRef.current);
          muteIntervalRef.current = null;
      }
  };

  const forceAudioMute = () => {
      stopMutingInterval();
      muteJitsiSharedVideo();
      muteIntervalRef.current = setInterval(muteJitsiSharedVideo, 500);
      setAudioMuted(true);
  };

  const initializeJitsi = async () => {
      if (isInitializing || (jitsiInitialized && jitsiApi)) return;
      if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) {
          console.warn('JitsiMeetExternalAPI script or container not ready.');
          return;
      }
      setIsInitializing(true);
      setSyncStatus('disconnected');

      try {
          if (jitsiContainerRef.current) {
              while (jitsiContainerRef.current.firstChild) {
                  jitsiContainerRef.current.removeChild(jitsiContainerRef.current.firstChild);
              }
          }
          setPlaylist([]);
          localStorage.removeItem('jitsi_shared_playlist');
          await new Promise((resolve) => setTimeout(resolve, 200));

          const config = {
              roomName: 'property-approval-meeting',
              parentNode: jitsiContainerRef.current,
              width: '100%',
              height: '100%',
              configOverwrite: {
                  startWithAudioMuted: true,
                  startWithVideoMuted: true,
                  prejoinPageEnabled: false,
                  enableWelcomePage: false,
                  enableClosePage: false,
                  channelLastN: -1,
                  enableDataChannels: true,
                  enableP2P: true,
                  p2p: { enabled: true },
                  disableAP: false,
              },
              interfaceConfigOverwrite: {
                  TOOLBAR_BUTTONS: [
                      'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen', 'fodeviceselection',
                      'hangup', 'profile', 'chat', 'recording', 'livestreaming', 'etherpad', 'sharedvideo',
                      'settings', 'raisehand', 'videoquality', 'filmstrip', 'invite', 'feedback', 'stats',
                      'shortcuts', 'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                      'security',
                  ],
                  SHOW_JITSI_WATERMARK: false,
                  SHOW_WATERMARK_FOR_GUESTS: false,
                  SHOW_BRAND_WATERMARK: false,
                  BRAND_WATERMARK_LINK: '',
                  SHOW_POWERED_BY: false,
                  SHOW_PROMOTIONAL_CLOSE_PAGE: false,
                  SHOW_CHROME_EXTENSION_BANNER: false,
                  MOBILE_APP_PROMO: false,

              },
          };

          // Confirmed Jitsi Instance
          const api = new window.JitsiMeetExternalAPI('meet-nso.diq.geoiq.ai', config);
          const newParticipantId = generateParticipantId();
          setParticipantId(newParticipantId);

          api.addEventListener('videoConferenceJoined', (event) => {
              setSyncStatus('connected');
              setTimeout(() => {
                  startPeriodicSync();
                  const localData = getLocalPlaylist();
                  if (localData && localData.playlist.length > 0) {
                      broadcastPlaylistUpdate('FULL_SYNC', localData.playlist);
                  } else {
                      broadcastPlaylistUpdate('REQUEST_SYNC', null);
                  }
              }, 2000);
          });

          api.addEventListener('participantJoined', (event) => {
              setTimeout(() => {
                  if (playlist.length > 0) {
                      broadcastPlaylistUpdate('FULL_SYNC', playlist);
                  }
              }, 1000);
          });

          api.addEventListener('endpointTextMessageReceived', (event) => {
              if (event.data) handleIncomingMessage(event.data);
          });
          api.addEventListener('incomingMessage', (event) => {
              if (event.message && event.message.includes('[PLAYLIST_SYNC]')) {
                  handleIncomingMessage(event.message);
              }
          });
          api.addEventListener('sharedVideoStarted', (event) => {
              setIsVideoSharing(true);
              setCurrentSharedVideo(event.url);
              forceAudioMute();
          });
          api.addEventListener('sharedVideoStopped', (event) => {
              setIsVideoSharing(false);
              setCurrentSharedVideo('');
              stopMutingInterval();
              setAudioMuted(false);
          });

          await new Promise((resolve) => {
              const checkReady = () => {
                  if (api.isAudioMuted !== undefined) resolve();
                  else setTimeout(checkReady, 100);
              };
              checkReady();
          });

          setJitsiApi(api);
          setJitsiInitialized(true);
      } catch (error) {
          console.error('Error during Jitsi initialization:', error);
          setJitsiInitialized(false);
          setJitsiApi(null);
          setSyncStatus('disconnected');
          showError('Failed to initialize Jitsi meeting. Check console for details.');
      } finally {
          setIsInitializing(false);
      }
  };

  const cleanupJitsi = () => {
    stopMutingInterval();
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    if (jitsiApi) {
      try { jitsiApi.dispose(); } catch (error) { console.error('Error disposing Jitsi API:', error); }
      setJitsiApi(null);
    }
    setJitsiInitialized(false);
    setIsVideoSharing(false);
    setCurrentSharedVideo('');
    setParticipantId('');
    setIsPlaylistSynced(false);
    setAudioMuted(false);
    setSyncStatus('disconnected');
    setPlaylist([]);
    localStorage.removeItem('jitsi_shared_playlist');
    if (jitsiContainerRef.current) {
      while (jitsiContainerRef.current.firstChild) {
        jitsiContainerRef.current.removeChild(jitsiContainerRef.current.firstChild);
      }
    }
  };

  const initializeJitsiOnLoad = () => {
    const jitsiScriptUrl = `https://meet-nso.diq.geoiq.ai/external_api.js?v=${Date.now()}`;
    const existingScript = document.querySelector(`script[src^="https://meet-nso.diq.geoiq.ai/external_api.js"]`);

    if (existingScript) {
        existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = jitsiScriptUrl;
    script.async = true;
    script.onload = initializeJitsi;
    script.onerror = () => showError('Failed to load Jitsi External API script from meet-nso.diq.geoiq.ai. Please check your network connection.');
    document.head.appendChild(script);
  };

  useEffect(() => {
    initializeJitsiOnLoad();
    return () => { cleanupJitsi(); };
  }, []);

  useEffect(() => {
    if (!jitsiContainerRef.current) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'IFRAME' || (node.querySelector && node.querySelector('iframe')) || node.tagName === 'VIDEO') {
              forceAudioMute();
            }
          });
        }
      });
    });
    observer.observe(jitsiContainerRef.current, { childList: true, subtree: true });
    return () => { observer.disconnect(); };
  }, [jitsiContainerRef]);

  const toggleMap = () => {
    setShowMap(!showMap);
    if (showPlaylist) setShowPlaylist(false);
    if (showCobrowsing) setShowCobrowsing(false);
  };

  const togglePlaylist = () => {
    setShowPlaylist(!showPlaylist);
    if (showMap) setShowMap(false);
    if (showCobrowsing) setShowCobrowsing(false);
  };

  const toggleCobrowsing = () => {
    setShowCobrowsing(!showCobrowsing);
    if (showMap) setShowMap(false);
    if (showPlaylist) setShowPlaylist(false);
  };

  const shareVideoDirectly = () => {
    if (jitsiApi && videoUrl) {
      try {
        if (isVideoSharing) stopVideoSharing();
        jitsiApi.executeCommand('startShareVideo', videoUrl);
        setIsVideoSharing(true);
        setCurrentSharedVideo(videoUrl);
        setVideoUrl('');
        forceAudioMute();
      } catch (error) {
        console.error('Error sharing video:', error);
        showError('Failed to share video. Please make sure you have joined the meeting.');
      }
    } else if (!jitsiApi) {
      showError('Please wait for the meeting to load and join first');
    } else {
      showError('Please enter a YouTube URL');
    }
  };

  const stopVideoSharing = () => {
    if (jitsiApi && isVideoSharing) {
      try {
        jitsiApi.executeCommand('stopShareVideo');
        setIsVideoSharing(false);
        setCurrentSharedVideo('');
        stopMutingInterval();
        setAudioMuted(false);
      } catch (error) {
        console.error('Error stopping video:', error);
      }
    }
  };

  const addToPlaylist = async () => {
    if (videoUrl && extractYouTubeVideoId(videoUrl)) {
      setIsLoadingVideoTitle(true);
      const videoId = extractYouTubeVideoId(videoUrl);
      try {
        const videoTitle = await fetchYouTubeVideoTitle(videoUrl);
        const newVideo = { id: Date.now() + Math.random(), url: videoUrl, videoId: videoId, title: videoTitle, };

        setPlaylist((prev) => {
          const newPlaylist = [...prev, newVideo];
          storePlaylistLocally(newPlaylist);
          return newPlaylist;
        });
        broadcastPlaylistUpdate('ADD', newVideo);
        setIsPlaylistSynced(true);
        setVideoUrl('');

      } catch (error) {
        console.error('Error adding video to playlist:', error);
        const newVideo = { id: Date.now() + Math.random(), url: videoUrl, videoId: videoId, title: `Video ${playlist.length + 1}`, };
        setPlaylist((prev) => {
          const newPlaylist = [...prev, newVideo];
          storePlaylistLocally(newPlaylist);
          return newPlaylist;
        });
        broadcastPlaylistUpdate('ADD', newVideo);
        setVideoUrl('');
      } finally {
        setIsLoadingVideoTitle(false);
      }
    } else {
      showError('Please enter a valid YouTube URL');
    }
  };

  const removeFromPlaylist = (id) => {
    setPlaylist((prev) => {
      const videoToRemove = prev.find(v => v.id === id);
      if (currentSharedVideo === videoToRemove?.url) {
        stopVideoSharing();
      }
      const newPlaylist = prev.filter((video) => video.id !== id);
      storePlaylistLocally(newPlaylist);
      broadcastPlaylistUpdate('REMOVE', { id });
      return newPlaylist;
    });
  };

  const handleShareVideo = (url) => {
    if (jitsiApi) {
      try {
        const videoId = extractYouTubeVideoId(url);
        if (videoId) {
          if (isVideoSharing) stopVideoSharing();
          jitsiApi.executeCommand('startShareVideo', url);
          setIsVideoSharing(true);
          setCurrentSharedVideo(url);
          forceAudioMute();
        } else {
          showError('Could not extract video ID from URL');
        }
      } catch (error) {
        console.error('Error sharing video from playlist:', error);
        showError('Failed to share video. Please make sure you have joined the meeting.');
      }
    } else {
      showError('Please wait for the meeting to load and join first');
    }
  };

  const extractYouTubeVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleDragStart = (e, video) => {
    setDraggedItem(video);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, targetVideo) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetVideo.id) return;
    const oldIndex = playlist.findIndex(item => item.id === draggedItem.id);
    const newIndex = playlist.findIndex(item => item.id === targetVideo.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newPlaylist = [...playlist];
    newPlaylist.splice(oldIndex, 1);
    newPlaylist.splice(newIndex, 0, draggedItem);
    setPlaylist(newPlaylist);
    storePlaylistLocally(newPlaylist);
    broadcastPlaylistUpdate('REORDER', newPlaylist);
    setDraggedItem(null);
  };
  const handleDragEnd = () => setDraggedItem(null);
  const filteredPlaylist = playlist.filter(video => video.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleCobrowsingInputChange = (e) => {
    setCobrowsingInput(e.target.value);
  };

  const handleApplyCobrowsingUrl = () => {
    let url = cobrowsingInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }
    setCobrowsingUrl(url);
    setCobrowsingInput(url);
  };


  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-gray-900 p-4 flex flex-col md:flex-row justify-between items-center flex-shrink-0 shadow-lg">
        {/* Title and Controls */}
        <div className="flex items-center justify-between w-full md:w-auto mb-4 md:mb-0">
          <div className="text-2xl font-bold text-white tracking-widest bg-red-600 px-3 py-1 rounded-lg">
            LENSKART
          </div>
          <div className="flex items-center md:hidden gap-2">
            <Button onClick={togglePlaylist} variant="ghost" size="icon" className="text-gray-400 hover:text-white" title={`Videos (${playlist.length})`}>
              {showPlaylist ? <ChevronDown className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </Button>
            <Button onClick={toggleMap} variant="ghost" size="icon" className="text-red-500 hover:text-red-400" title="Show Map">
              {showMap ? <X className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </Button>
            <Button onClick={toggleCobrowsing} variant="ghost" size="icon" className="text-yellow-500 hover:text-yellow-400" title="Co-browsing">
              {showCobrowsing ? <X className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Paste YouTube URL..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1 min-w-0 px-4 py-2 rounded-lg bg-gray-700 text-sm placeholder-gray-400 border border-gray-600 focus:border-white focus:ring-1 focus:ring-white transition-colors"
              onKeyPress={(e) => { if (e.key === 'Enter') shareVideoDirectly(); }}
              disabled={isInitializing || isLoadingVideoTitle}
            />
            {!isVideoSharing ? (
              <Button onClick={shareVideoDirectly} className="bg-blue-600 hover:bg-blue-700 transition-colors" disabled={!videoUrl.trim() || isInitializing || isLoadingVideoTitle}>
                Share
              </Button>
            ) : (
              <Button onClick={stopVideoSharing} className="bg-red-600 hover:bg-red-700 transition-colors" disabled={isInitializing}>
                Stop
              </Button>
            )}
            <Button onClick={addToPlaylist} className="bg-green-600 hover:bg-green-700 text-white transition-colors" disabled={!videoUrl.trim() || isInitializing || isLoadingVideoTitle}>
              {isLoadingVideoTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button onClick={togglePlaylist} variant="ghost" size="icon" className="text-gray-400 hover:bg-gray-700 hover:text-white" title={`Videos (${playlist.length})`}>
              {showPlaylist ? <ChevronDown className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </Button>
            <Button onClick={toggleMap} variant="ghost" size="icon" className="text-red-500 hover:bg-gray-700 hover:text-red-400" title="Show Map">
              {showMap ? <X className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </Button>
            <Button onClick={toggleCobrowsing} variant="ghost" size="icon" className="text-yellow-500 hover:bg-gray-700 hover:text-yellow-400" title="Co-browsing">
              {showCobrowsing ? <X className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {/* Jitsi Container */}
        <div className="w-full h-full bg-black flex flex-col min-h-0 relative">
          {isInitializing && (
            <div className="w-full h-full flex items-center justify-center bg-gray-950">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
                <p className="text-xl font-medium">Initializing meeting...</p>
                <p className="text-gray-400 text-sm mt-1">Connecting to Lenskart instance at meet-nso.diq.geoiq.ai</p>
              </div>
            </div>
          )}
          <div
            ref={jitsiContainerRef}
            id="jitsi-container"
            className="w-full h-full flex-1 min-h-0"
            style={{
              minHeight: '400px',
              display: isInitializing ? 'none' : 'block',
            }}
          />
        </div>

        {/* Panels Container */}
        {(showPlaylist || showMap || showCobrowsing) && (
          <div className="fixed bottom-0 left-0 right-0 h-2/3 md:h-full md:relative md:w-1/2 lg:w-1/3 bg-gray-800 border-t md:border-l border-gray-700 shadow-xl flex flex-col z-20 transition-all duration-300 ease-in-out">

            {/* Playlist Panel */}
            {showPlaylist && (
              <div className="flex flex-col h-full">
                <div className="bg-gray-900 p-4 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
                  <h2 className="text-lg font-semibold text-white">Video Playlist ({playlist.length})</h2>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search videos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48 px-3 py-1 rounded-lg bg-gray-700 text-sm placeholder-gray-400 border border-gray-600 focus:border-blue-500 focus:outline-none pl-8"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {filteredPlaylist.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">
                      <List className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No videos found</p>
                      <p className="text-sm">Add YouTube URLs or try a different search term.</p>
                    </div>
                  ) : (
                    filteredPlaylist.map((video) => (
                      <div
                        key={video.id}
                        className={`
                          bg-gray-700/50 rounded-xl p-3 shadow-md
                          flex items-center gap-4 cursor-grab
                          active:cursor-grabbing transform transition-all duration-150
                          ${draggedItem?.id === video.id ? 'opacity-50 scale-95 ring-2 ring-blue-500' : ''}
                          ${currentSharedVideo === video.url ? 'border-l-4 border-green-500' : 'border-l-4 border-transparent'}
                        `}
                        draggable
                        onDragStart={(e) => handleDragStart(e, video)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, video)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm leading-tight text-white">{video.title}</h3>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2 ml-4">
                          {currentSharedVideo === video.url ? (
                            <Button onClick={stopVideoSharing} variant="ghost" size="icon" className="text-red-400 hover:bg-red-400/20" title="Stop this video" disabled={isInitializing}>
                              <X className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button onClick={() => handleShareVideo(video.url)} variant="ghost" size="icon" className="text-green-400 hover:bg-green-400/20" title="Play this video now" disabled={isInitializing}>
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button onClick={() => removeFromPlaylist(video.id)} variant="ghost" size="icon" className="text-red-400 hover:bg-red-400/20" title="Remove from playlist" disabled={isInitializing}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Map Panel */}
            {showMap && (
              <div className="flex flex-col h-full">
                <div className="bg-gray-900 p-4 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
                  <h2 className="text-lg font-semibold text-white">Property Map (Lenskart Locations)</h2>
                </div>
                <div className="flex-1 min-h-0">
                  <EnhancedFreeMap />
                </div>
              </div>
            )}

            {/* COBROWSING PANEL */}
            {showCobrowsing && (
              <div className="flex flex-col h-full">
                <div className="bg-gray-900 p-4 border-b border-gray-700 flex-shrink-0">
                  <h2 className="text-lg font-semibold text-white mb-2">Co-browsing (Shared Web View)</h2>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Enter URL to co-browse (e.g., lenskart.com)"
                      value={cobrowsingInput}
                      onChange={handleCobrowsingInputChange}
                      onKeyPress={(e) => { if (e.key === 'Enter') handleApplyCobrowsingUrl(); }}
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-700 text-sm placeholder-gray-400 border border-gray-600 focus:border-yellow-500 focus:outline-none"
                    />
                    <Button onClick={handleApplyCobrowsingUrl} className="bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-bold" title="Share this URL">
                      <ScreenShare className="w-4 h-4 mr-2" /> Share
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <div className="absolute top-0 left-0 right-0 p-2 bg-yellow-900/50 text-yellow-300 text-xs border-b border-yellow-800 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span>Note: Many sites will not load here due to security (X-Frame-Options).</span>
                  </div>
                  <iframe
                    src={cobrowsingUrl}
                    title="Co-browsing View"
                    className="w-full h-full pt-10"
                    allow="clipboard-read; clipboard-write"
                  ></iframe>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Custom Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-gray-950/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
                <h2 className="text-white text-xl font-semibold">Error</h2>
              </div>
              <Button onClick={() => setShowErrorModal(false)} variant="ghost" size="icon" className="text-gray-400 hover:bg-gray-700">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {errorMessage}
            </p>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowErrorModal(false)} className="bg-red-600 hover:bg-red-700 text-white">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
