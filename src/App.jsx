<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jitsi Video Share & Sync App</title>
    <!-- Load Tailwind CSS CDN for styling utility classes -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        // Configure Tailwind to use the Inter font by default
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        'green-950': '#0d1a18',
                        'green-900': '#152b27',
                        'green-800': '#1c3d38',
                        'green-700': '#2c534e',
                        'lime-400': '#a7f3d0',
                        'lime-500': '#86efad',
                        'amber-500': '#f59e0b',
                        'amber-600': '#d97706',
                    }
                }
            }
        }
    </script>
    <!-- Load React and ReactDOM from CDN -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <!-- Load Babel for JSX and modern JavaScript syntax support in the browser -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <style>
        /* Custom scrollbar for better visibility */
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #1c3d38; /* green-800 */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #2c534e; /* green-700 */
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #a7f3d0; /* lime-400 */
        }

        /* Ensure the main root container fills the viewport */
        #root {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Essential fix for Jitsi iframe visibility */
        #jitsi-container iframe {
            display: block;
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        // Import replacements for lucide-react (since we can't import node modules directly in a CDN environment)
        // These are inline SVG definitions that match the lucide icons used in App.jsx
        const MapPin = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
        const X = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
        const List = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>;
        const Plus = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
        const Play = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
        const Trash2 = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
        const Loader2 = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
        const Search = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
        const ChevronDown = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
        const AlertCircle = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>;
        const Monitor = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>;
        const ScreenShare = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;


        const { useState, useEffect, useRef } = React;

        // --- INLINE UI COMPONENT REPLACEMENTS ---

        // 1. Simplified Button Component (to replace external import)
        const Button = ({ children, onClick, className = '', variant = 'default', size = 'default', disabled = false, title = '' }) => {
            let baseStyle = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:pointer-events-none shadow-md';
            let variantStyle = '';
            let sizeStyle = '';

            switch (variant) {
                case 'ghost':
                    variantStyle = 'bg-transparent hover:bg-green-700/50';
                    break;
                case 'outline':
                    variantStyle = 'border border-amber-500 text-amber-500 hover:bg-amber-500/10';
                    break;
                default:
                    variantStyle = 'bg-amber-500 text-gray-900 hover:bg-amber-600';
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

        // --- INLINE FEATURE COMPONENTS ---

        // 2. Replit Co-browsing Component (New Feature)
        const ReplitCoBrowsingView = () => {
            // The sample URL provided uses a dynamic room ID, so we use a mock one for demonstration.
            const sampleUrl = 'https://geo-stream.replit.app/playback/c5eca37c-0e06-47ae-a96e-2ae1623e53fc?roomId=bdhOlu_XJu';

            return (
                <div className="flex flex-col h-full bg-green-950">
                    <div className="bg-green-900 p-4 flex items-center justify-between border-b border-green-700 flex-shrink-0">
                        <h2 className="text-lg font-semibold flex items-center">
                            <ScreenShare className="w-5 h-5 mr-2 text-lime-400" />
                            Replit Co-browsing Stream
                        </h2>
                        <span className="text-xs text-gray-400">Sample Stream Demo</span>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                        <iframe
                            src={sampleUrl}
                            className="w-full h-full border-0"
                            title="Replit Co-browsing Video Playback"
                            allowFullScreen
                            style={{ minHeight: '300px' }}
                        />
                    </div>
                     <div className="p-2 text-center bg-green-900 text-xs text-gray-500 border-t border-green-700">
                        This is a live co-browsing stream loaded from Replit.
                    </div>
                </div>
            );
        };

        // 3. EnhancedFreeMap Component (Defined Inline)
        const EnhancedFreeMap = () => {
            // Using an iframe to embed a simple, responsive OpenStreetMap view for compliance.
            const mapEmbedUrl = "https://www.openstreetmap.org/export/embed.html?bbox=77.5946%2C12.9716%2C77.5996%2C12.9766&layer=mapnik&marker=12.9741,77.5971";

            return (
                <div className="flex flex-col h-full bg-gray-100">
                    <div className="bg-green-900 p-4 flex items-center justify-between border-b border-green-700 flex-shrink-0">
                        <h2 className="text-lg font-semibold flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-lime-400" />
                            Interactive Map Service
                        </h2>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                        <iframe
                            src={mapEmbedUrl}
                            className="w-full h-full border-0"
                            title="OpenStreetMap Embed"
                            allowFullScreen
                            style={{ filter: 'grayscale(20%) brightness(80%)', minHeight: '300px' }}
                        />
                    </div>
                </div>
            );
        };


        // --- MAIN APP COMPONENT ---

        function App() {
          const [showMap, setShowMap] = useState(false);
          const [showReplitView, setShowReplitView] = useState(false); // New state for Replit view
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
              syncIntervalRef.current = null;
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
                      // The configOverwrite and interfaceConfigOverwrite are now removed
                      // to rely on the default Jitsi server configuration.
                  };

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
            const jitsiScriptUrl = `https://meet-nso.diq.geoiq.ai/external_api.js?v=${Date.now()}`;
            const existingScript = document.querySelector(`script[src^="https://meet-nso.diq.geoiq.ai/external_api.js"]`);

            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement('script');
            script.src = jitsiScriptUrl;
            script.async = true;
            script.onload = initializeJitsi;
            script.onerror = () => console.error('Failed to load Jitsi External API script.');
            document.head.appendChild(script);
          };

          useEffect(() => {
            // Only load the Jitsi script once when the component mounts
            if (!jitsiInitialized && !isInitializing) {
              initializeJitsiOnLoad();
            }
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

          // Unified Toggle Function
          const togglePanel = (panelName) => {
            setShowPlaylist(panelName === 'playlist' ? !showPlaylist : false);
            setShowMap(panelName === 'map' ? !showMap : false);
            setShowReplitView(panelName === 'replit' ? !showReplitView : false);
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

          // Determine which panel is currently open
          const isPanelOpen = showPlaylist || showMap || showReplitView;

          return (
            <div className="h-screen w-screen flex flex-col bg-green-950 text-white overflow-hidden font-sans">
              <header className="bg-green-900 px-4 py-2 flex flex-col md:flex-row justify-between items-center flex-shrink-0 shadow-lg">
                <div className="flex items-center justify-between w-full md:w-auto mb-2 md:mb-0">
                  <div className="flex items-center md:hidden gap-2">
                    <Button onClick={() => togglePanel('playlist')} variant="ghost" size="icon" className="text-amber-500 hover:text-amber-600" title={`Videos (${playlist.length})`}>
                      {showPlaylist ? <ChevronDown className="w-5 h-5" /> : <List className="w-5 h-5" />}
                    </Button>
                    <Button onClick={() => togglePanel('map')} variant="ghost" size="icon" className="text-amber-500 hover:text-amber-600" title="Show Map">
                      {showMap ? <X className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                    </Button>
                    <Button onClick={() => togglePanel('replit')} variant="ghost" size="icon" className="text-amber-500 hover:text-amber-600" title="Show Replit Stream">
                      {showReplitView ? <X className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="Paste YouTube URL..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className={`flex-1 min-w-0 px-4 py-2 rounded-lg bg-amber-400 text-sm text-gray-900 placeholder-gray-900/70 border border-amber-600 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 transition-colors`}
                      onKeyPress={(e) => { if (e.key === 'Enter') shareVideoDirectly(); }}
                      disabled={isInitializing || isLoadingVideoTitle}
                    />
                    {!isVideoSharing ? (
                      <Button
                        onClick={shareVideoDirectly}
                        className={`${videoUrl.trim() ? 'bg-amber-500 hover:bg-amber-600' : 'bg-amber-600 cursor-not-allowed'} transition-colors text-gray-900`}
                        disabled={!videoUrl.trim() || isInitializing || isLoadingVideoTitle}
                      >
                        Share
                      </Button>
                    ) : (
                      <Button onClick={stopVideoSharing} className="bg-rose-600 hover:bg-rose-700 transition-colors text-white" disabled={isInitializing}>
                        Stop
                      </Button>
                    )}
                    <Button onClick={addToPlaylist} className="bg-amber-500 hover:bg-amber-600 text-gray-900 transition-colors" disabled={!videoUrl.trim() || isInitializing || isLoadingVideoTitle}>
                      {isLoadingVideoTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <Button onClick={() => togglePanel('playlist')} variant="ghost" size="icon" className="text-amber-500 hover:bg-green-700 hover:text-amber-500" title={`Videos (${playlist.length})`}>
                      {showPlaylist ? <ChevronDown className="w-5 h-5" /> : <List className="w-5 h-5" />}
                    </Button>
                    <Button onClick={() => togglePanel('map')} variant="ghost" size="icon" className="text-amber-500 hover:bg-green-700 hover:text-amber-500" title="Show Map">
                      {showMap ? <X className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                    </Button>
                     <Button onClick={() => togglePanel('replit')} variant="ghost" size="icon" className="text-amber-500 hover:bg-green-700 hover:text-amber-500" title="Show Replit Stream">
                      {showReplitView ? <X className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </header>

              <div className="flex-1 flex flex-col md:flex-row min-h-0 relative bg-green-900 p-4 md:p-8">
                <div className="w-full h-full bg-green-900 flex flex-col min-h-0 relative rounded-2xl overflow-hidden shadow-2xl">
                  {isInitializing && (
                    <div className="w-full h-full flex items-center justify-center bg-green-950">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
                        <p className="text-xl font-medium">Initializing meeting...</p>
                        <p className="text-gray-400 text-sm mt-1">Please wait while we set up your conference</p>
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

                {isPanelOpen && (
                  <div className={`
                    fixed bottom-0 left-0 right-0 h-2/3 md:h-full md:relative md:w-1/2 bg-green-800 border-t md:border-l border-green-700 shadow-xl flex flex-col z-20 transition-transform duration-300 ease-in-out
                    ${showMap || showReplitView ? 'md:w-1/2' : 'md:w-[400px]'}
                  `}>
                    {showPlaylist && (
                      <div className="flex flex-col h-full">
                        <div className="bg-green-900 p-4 flex items-center justify-between border-b border-green-700 flex-shrink-0">
                          <h2 className="text-lg font-semibold">Video Playlist ({playlist.length})</h2>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search videos..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-48 px-3 py-1 rounded-lg bg-green-700 text-sm placeholder-gray-300 border border-green-600 focus:border-lime-500 focus:outline-none pl-8"
                            />
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
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
                                  bg-green-700/50 rounded-xl p-3 shadow-md
                                  flex items-center gap-4 cursor-grab
                                  active:cursor-grabbing transform transition-all duration-150
                                  ${draggedItem?.id === video.id ? 'opacity-50 scale-95 ring-2 ring-lime-500' : ''}
                                  ${currentSharedVideo === video.url ? 'border-l-4 border-lime-500' : 'border-l-4 border-transparent'}
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
                                    <Button onClick={stopVideoSharing} variant="ghost" size="icon" className="text-rose-400 hover:bg-rose-400/20" title="Stop this video" disabled={isInitializing}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button onClick={() => handleShareVideo(video.url)} variant="ghost" size="icon" className="text-emerald-400 hover:bg-emerald-400/20" title="Play this video now" disabled={isInitializing}>
                                      <Play className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button onClick={() => removeFromPlaylist(video.id)} variant="ghost" size="icon" className="text-gray-400 hover:bg-gray-700/20" title="Remove from playlist" disabled={isInitializing}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {showMap && <EnhancedFreeMap />}
                    {showReplitView && <ReplitCoBrowsingView />}

                  </div>
                )}
              </div>

              {showErrorModal && (
                <div className="fixed inset-0 bg-green-950/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                  <div className="bg-green-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-green-700">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <AlertCircle className="w-6 h-6 text-lime-500 mr-3" />
                        <h2 className="text-white text-xl font-semibold">Error</h2>
                      </div>
                      <Button onClick={() => setShowErrorModal(false)} variant="ghost" size="icon" className="text-gray-400 hover:bg-green-700">
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                      {errorMessage}
                    </p>
                    <div className="mt-6 flex justify-end">
                      <Button onClick={() => setShowErrorModal(false)} className="bg-lime-600 hover:bg-lime-700 text-white">
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }

        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>
