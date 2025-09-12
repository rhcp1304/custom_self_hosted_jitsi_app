import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import {
  MapPin, X, Youtube, List, Plus, Play, Trash2, Key, Loader2, Search, ChevronDown, AlertCircle,
} from 'lucide-react';
import EnhancedFreeMap from './components/EnhancedFreeMap.jsx';
import './App.css';
import LenskartLogo from './logo.png';

function App() {
  const [showMap, setShowMap] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [isVideoSharing, setIsVideoSharing] = useState(false);
  const [currentSharedVideo, setCurrentSharedVideo] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [jwtToken, setJwtToken] = useState('');
  const [showJwtModal, setShowJwtModal] = useState(false);
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
    localStorage.setItem('jitsi_shared_playlist', JSON.stringify(data));
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
    try {
      jitsiApi.executeCommand('sendEndpointTextMessage', '', JSON.stringify(message));
    } catch (error) {
      console.log('Data channel failed, trying chat:', error);
    }
    try {
      const chatMessage = `[PLAYLIST_SYNC] ${JSON.stringify(message)}`;
      jitsiApi.executeCommand('sendChatMessage', chatMessage);
    } catch (error) {
      console.log('Chat method also failed:', error);
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
      } else {
        return;
      }
      if (message.participantId === participantId) return;

      if (message.type === 'PLAYLIST_SYNC') {
        switch (message.action) {
          case 'ADD':
            setPlaylist((prev) => {
              const exists = prev.find((video) => video.id === message.data.id);
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
        broadcastPlaylistUpdate('REQUEST_SYNC', null);
        const localData = getLocalPlaylist();
        if (localData && localData.participantId !== participantId) {
          const timeDiff = Date.now() - localData.timestamp;
          if (timeDiff < 30000) {
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
          prejoinPageEnabled: true,
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
        },
      };

      if (jwtToken && jwtToken.trim() && jwtToken.trim().length > 10) {
        config.jwt = jwtToken.trim();
      }

      const api = new window.JitsiMeetExternalAPI('meet-nso.diq.geoiq.ai', config);
      const newParticipantId = generateParticipantId();
      setParticipantId(newParticipantId);

      api.addEventListener('videoConferenceJoined', (event) => {
        setSyncStatus('connected');
        setTimeout(() => {
          startPeriodicSync();
          broadcastPlaylistUpdate('FULL_SYNC', playlist);
        }, 2000);
      });

      api.addEventListener('participantJoined', (event) => {
        setTimeout(() => {
          if (playlist.length > 0) {
            broadcastPlaylistUpdate('FULL_SYNC', playlist);
          }
        }, 1000);
      });

      api.addEventListener('endpointTextMessageReceived', (event) => handleIncomingMessage(event));
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
    const jitsiScriptUrl = 'https://meet-nso.diq.geoiq.ai/external_api.js';
    const existingScript = document.querySelector(`script[src="${jitsiScriptUrl}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = jitsiScriptUrl;
      script.async = true;
      script.onload = initializeJitsi;
      script.onerror = () => console.error('Failed to load Jitsi External API script.');
      document.head.appendChild(script);
    } else {
      initializeJitsi();
    }
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
            if (node.tagName === 'IFRAME' || (node.querySelector && node.querySelector('iframe'))) {
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
        setVideoUrl('');
        broadcastPlaylistUpdate('ADD', newVideo);
        setIsPlaylistSynced(true);
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
      const newPlaylist = prev.filter((video) => video.id !== id);
      storePlaylistLocally(newPlaylist);
      return newPlaylist;
    });
    broadcastPlaylistUpdate('REMOVE', { id });
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

  const togglePlaylist = () => {
    setShowPlaylist(!showPlaylist);
    if (showMap) setShowMap(false);
  };

  const extractYouTubeVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleJwtSubmit = async () => {
    setShowJwtModal(false);
    cleanupJitsi();
    await new Promise((resolve) => setTimeout(resolve, 500));
    initializeJitsi();
  };

  const toggleJwtModal = () => setShowJwtModal(!showJwtModal);

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

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        {/* Title and Controls */}
        <div className="title-container">
          <img src={LenskartLogo} alt="Lenskart Logo" className="brand-logo" />
          <div className="hidden-md flex items-center gap-2">
            <Button onClick={toggleJwtModal} variant="ghost" size="icon" className="button-ghost-accent" title="Configure JWT">
              <Key className="w-5 h-5" />
            </Button>
            <Button onClick={togglePlaylist} variant="ghost" size="icon" className="button-ghost" title={`Videos (${playlist.length})`}>
              {showPlaylist ? <ChevronDown className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </Button>
            <Button onClick={toggleMap} variant="ghost" size="icon" className="button-ghost-danger" title="Show Map">
              {showMap ? <X className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="header-controls">
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              placeholder="Paste YouTube URL..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="input-field"
              onKeyPress={(e) => { if (e.key === 'Enter') shareVideoDirectly(); }}
              disabled={isInitializing || isLoadingVideoTitle}
            />
            {!isVideoSharing ? (
              <Button onClick={shareVideoDirectly} className="button-primary" disabled={!videoUrl.trim() || isInitializing || isLoadingVideoTitle}>
                Share
              </Button>
            ) : (
              <Button onClick={stopVideoSharing} className="button-danger" disabled={isInitializing}>
                Stop
              </Button>
            )}
            <Button onClick={addToPlaylist} className="button-secondary" disabled={!videoUrl.trim() || isInitializing || isLoadingVideoTitle}>
              {isLoadingVideoTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <div className="hidden-mobile flex items-center gap-2">
            <Button onClick={toggleJwtModal} variant="ghost" size="icon" className="button-ghost-accent" title="Configure JWT">
              <Key className="w-5 h-5" />
            </Button>
            <Button onClick={togglePlaylist} variant="ghost" size="icon" className="button-ghost" title={`Videos (${playlist.length})`}>
              {showPlaylist ? <ChevronDown className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </Button>
            <Button onClick={toggleMap} variant="ghost" size="icon" className="button-ghost-danger" title="Show Map">
              {showMap ? <X className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="app-main">
        {/* Jitsi Container */}
        <div className="jitsi-container-wrapper">
          {isInitializing && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-white" />
                <p className="text-lg font-medium">Initializing meeting...</p>
                <p className="text-gray-400 text-sm">Please wait while we set up your conference</p>
              </div>
            </div>
          )}
          <div
            ref={jitsiContainerRef}
            id="jitsi-container"
            className="flex-1 min-h-400px"
            style={{
              display: isInitializing ? 'none' : 'block',
            }}
          />
        </div>

        {/* Panels Container */}
        {(showPlaylist || showMap) && (
          <div className="panel-container">
            {/* Playlist Panel */}
            {showPlaylist && (
              <div className="panel-content">
                <div className="panel-header">
                  <h2 className="text-lg font-semibold">Video Playlist ({playlist.length})</h2>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search videos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="playlist-list custom-scrollbar">
                  {filteredPlaylist.length === 0 ? (
                    <div className="text-gray-400 text-center">
                      <List className="w-12 h-12 mx-auto mb-2" />
                      <p>No videos found</p>
                      <p className="text-sm">Add YouTube URLs or try a different search term.</p>
                    </div>
                  ) : (
                    filteredPlaylist.map((video) => (
                      <div
                        key={video.id}
                        className={`
                          playlist-item
                          ${draggedItem?.id === video.id ? 'is-dragging' : ''}
                          ${currentSharedVideo === video.url ? 'is-playing' : ''}
                        `}
                        draggable
                        onDragStart={(e) => handleDragStart(e, video)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, video)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{video.title}</h3>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {currentSharedVideo === video.url ? (
                            <Button onClick={stopVideoSharing} variant="ghost" size="icon" className="button-ghost-danger" title="Stop this video" disabled={isInitializing}>
                              <X className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button onClick={() => handleShareVideo(video.url)} variant="ghost" size="icon" className="button-secondary" title="Play this video now" disabled={isInitializing}>
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button onClick={() => removeFromPlaylist(video.id)} variant="ghost" size="icon" className="button-ghost-danger" title="Remove from playlist" disabled={isInitializing}>
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
              <div className="panel-content">
                <div className="panel-header">
                  <h2 className="text-lg font-semibold">Map Services</h2>
                </div>
                <div className="flex-1 min-h-0">
                  <EnhancedFreeMap />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* JWT Modal */}
      {showJwtModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-lg font-semibold">Enter JWT Token</h2>
              <Button onClick={toggleJwtModal} variant="ghost" size="icon" className="button-ghost">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Enter your Jitsi as a Service (JaaS) JSON Web Token to access premium features.
            </p>
            <input
              type="password"
              placeholder="Paste your JWT token here..."
              value={jwtToken}
              onChange={(e) => setJwtToken(e.target.value)}
              className="input-field w-full"
            />
            <div className="flex justify-end mt-6">
              <Button onClick={handleJwtSubmit} className="button-primary">
                Apply & Refresh
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Error Modal */}
      {showErrorModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h2 className="text-white text-lg font-semibold">Error</h2>
              </div>
              <Button onClick={() => setShowErrorModal(false)} variant="ghost" size="icon" className="button-ghost">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {errorMessage}
            </p>
            <div className="flex justify-end mt-6">
              <Button onClick={() => setShowErrorModal(false)} className="button-danger">
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
