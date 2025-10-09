import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, X, Youtube, List, Plus, Play, Trash2, Loader2, Search, ChevronDown, AlertCircle, Monitor, ScreenShare,
} from 'lucide-react';

// --- Global Constants and Firebase Setup (Keep apiKey empty for Canvas environment) ---
const apiKey = "";
const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// Global variables for Firebase environment (MANDATORY USE)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Mock Firebase Imports (Real imports are handled externally in the Canvas setup)
// We assume these functions are globally available or handled by the environment
/*
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
*/

// --- INLINE UI COMPONENT REPLACEMENTS (For Tailwind/Lucide) ---

const Button = ({ children, onClick, className = '', variant = 'default', size = 'default', disabled = false, title = '' }) => {
    let baseStyle = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:pointer-events-none shadow-md';
    let variantStyle = '';
    let sizeStyle = '';

    switch (variant) {
        case 'ghost':
            variantStyle = 'bg-transparent text-white hover:bg-green-700/50';
            break;
        case 'outline':
            variantStyle = 'border border-amber-500 text-amber-500 hover:bg-amber-500/10';
            break;
        case 'secondary':
            variantStyle = 'bg-green-700 text-white hover:bg-green-600';
            break;
        case 'destructive':
            variantStyle = 'bg-red-600 text-white hover:bg-red-700';
            break;
        default:
            variantStyle = 'bg-amber-500 text-gray-900 hover:bg-amber-600';
    }

    switch (size) {
        case 'icon':
            sizeStyle = 'h-10 w-10 p-2';
            break;
        case 'sm':
            sizeStyle = 'h-9 px-3 text-sm';
            break;
        default:
            sizeStyle = 'h-11 px-4 py-2';
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

const Input = ({ value, onChange, placeholder, className = '', type = 'text', disabled = false }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex h-10 w-full rounded-xl border border-green-600 bg-green-900 px-3 py-2 text-sm text-white placeholder:text-green-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-green-950 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${className}`}
    />
);

const Card = ({ children, className = '' }) => (
    <div className={`rounded-2xl bg-green-800/50 backdrop-blur-sm p-6 shadow-xl border border-green-700 ${className}`}>
        {children}
    </div>
);

// --- Mock Jitsi Meet External API ---
let jitsiApi = null;
const JitsiMeetExternalAPI = window.JitsiMeetExternalAPI;

// --- Helper Functions ---

const generateRoomName = () => {
    return 'jitsi-map-room-' + Math.random().toString(36).substring(2, 9);
};

async function exponentialBackoffFetch(url, options, maxRetries = 5, initialDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                // Throw error to trigger retry for specific status codes if needed, otherwise handle
                if (response.status === 429 || response.status >= 500) {
                     throw new Error(`Server error: ${response.status}`);
                }
            }
            return response;
        } catch (error) {
            if (i === maxRetries - 1) {
                console.error("Fetch failed after multiple retries:", error);
                throw error;
            }
            const delay = initialDelay * Math.pow(2, i) + Math.random() * 500;
            // console.log(`Retry ${i + 1}/${maxRetries} after ${delay.toFixed(0)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// --- Jitsi Integration ---

const JitsiMeet = ({ roomName, displayName, parentNode, onReady, onConferenceJoined, onConferenceLeft }) => {
    const jitsiContainerRef = useRef(null);

    useEffect(() => {
        if (!JitsiMeetExternalAPI) {
            console.error("JitsiMeetExternalAPI not loaded.");
            return;
        }

        const options = {
            roomName: roomName,
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: displayName
            },
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: true,
            },
            interfaceConfigOverwrite: {
                DEFAULT_BACKGROUND: '#10b981', // Emerald 500
                JITSI_WATERMARK_LINK: 'https://jitsi.org/',
                DEFAULT_REMOTE_DISPLAY_NAME: 'Fellow Collaborator',
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat',
                    'tileview', 'settings', 'videoquality', 'link'
                ],
            },
        };

        const api = new JitsiMeetExternalAPI('meet.jit.si', options);
        jitsiApi = api;

        api.addListener('readyToClose', onConferenceLeft);
        api.addListener('videoConferenceJoined', onConferenceJoined);

        if (onReady) onReady(api);

        return () => {
            if (api) {
                api.dispose();
                jitsiApi = null;
            }
        };
    }, [roomName, displayName, onConferenceJoined, onConferenceLeft, onReady]);

    return (
        <div ref={jitsiContainerRef} className="w-full h-full min-h-[300px] rounded-xl overflow-hidden shadow-2xl">
            {/* Jitsi content will be injected here */}
        </div>
    );
};

// --- LLM Service for Location/Map Analysis ---

const analyzeMapPrompt = async (prompt) => {
    const systemPrompt = "You are a specialized geographical and map analyst. Analyze the user's request and provide a concise, structured JSON object with the most relevant search queries (up to 3) to find location information or relevant videos/resources. DO NOT generate an actual text response, only the JSON.";
    const userQuery = `Analyze the following map-related or location-related request and suggest search queries: "${prompt}"`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    searchQueries: {
                        type: "ARRAY",
                        description: "A list of up to 3 highly relevant and specific search queries to find the requested location, map data, or educational video resources.",
                        items: { type: "STRING" }
                    }
                },
                required: ["searchQueries"]
            }
        }
    };

    try {
        const response = await exponentialBackoffFetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
            const parsedJson = JSON.parse(jsonText);
            return parsedJson.searchQueries || [];
        }
        return [];

    } catch (e) {
        console.error("LLM API call failed:", e);
        return ["Map analysis failed, search manually"];
    }
};

// --- Main App Component ---

const App = () => {
    // Firebase State
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // App State
    const [displayName, setDisplayName] = useState('');
    const [activeRoom, setActiveRoom] = useState(null); // The room the user is currently in (string)
    const [showRoomView, setShowRoomView] = useState(true); // Toggles between Room/Map/Replit view
    const [showMap, setShowMap] = useState(false);
    const [showReplitView, setShowReplitView] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Room List State
    const [rooms, setRooms] = useState([]); // List of publicly shared room objects
    const [newRoomName, setNewRoomName] = useState('');

    // LLM/Search State
    const [mapSearchPrompt, setMapSearchPrompt] = useState('');
    const [llmSearchQueries, setLlmSearchQueries] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Error Modal State
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const displayAlert = (message) => {
        setErrorMessage(message);
        setShowErrorModal(true);
    };

    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        console.log("Starting Firebase initialization...");
        try {
            // Note: Canvas provides the necessary Firebase environment
            if (Object.keys(firebaseConfig).length > 0) {
                 const app = window.firebase.initializeApp(firebaseConfig);
                 const fAuth = window.firebase.getAuth(app);
                 const fDb = window.firebase.getFirestore(app);

                 setDb(fDb);
                 setAuth(fAuth);

                 window.firebase.onAuthStateChanged(fAuth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        // Sign in anonymously if initial auth token is missing
                        if (initialAuthToken) {
                            await window.firebase.signInWithCustomToken(fAuth, initialAuthToken);
                        } else {
                            await window.firebase.signInAnonymously(fAuth);
                        }
                    }
                    setIsAuthReady(true);
                    console.log("Firebase Auth Ready.");
                 });
                 window.firebase.setLogLevel('debug'); // For Firestore logs

            } else {
                displayAlert("Firebase configuration is missing. Data persistence will not work.");
                setUserId(crypto.randomUUID()); // Fallback to a random ID
                setIsAuthReady(true);
            }
        } catch (e) {
            console.error("Firebase Init Error:", e);
            displayAlert(`Failed to initialize Firebase: ${e.message}`);
        }
    }, []);

    // --- Firestore Data Listener (Public Rooms) ---
    useEffect(() => {
        if (!db || !isAuthReady) return;

        try {
            const roomsColRef = window.firebase.collection(db, `artifacts/${appId}/public/data/jitsi_rooms`);
            const q = window.firebase.query(roomsColRef);

            const unsubscribe = window.firebase.onSnapshot(q, (snapshot) => {
                const fetchedRooms = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort by last activity or creation time
                setRooms(fetchedRooms.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0)));
                console.log("Rooms updated from Firestore.");
            }, (error) => {
                console.error("Error listening to rooms:", error);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firestore setup error:", e);
            // Handle error (e.g., display error message)
        }
    }, [db, isAuthReady]);


    // --- Handlers ---

    const handleCreateRoom = useCallback(async () => {
        if (!userId || !db) {
            displayAlert("Authentication not complete. Please wait a moment.");
            return;
        }

        const roomNameSlug = newRoomName.trim().replace(/\s+/g, '-').toLowerCase() || generateRoomName();
        if (roomNameSlug.length === 0) {
             displayAlert("Room name cannot be empty.");
             return;
        }

        setIsLoading(true);
        try {
            const roomData = {
                name: newRoomName.trim() || `Untitled Room (${Date.now()})`,
                jitsiRoomId: roomNameSlug,
                creatorId: userId,
                creatorName: displayName || 'Anonymous User',
                createdAt: window.firebase.serverTimestamp(),
                lastActivity: Date.now(),
                users: [userId],
                active: true,
                mapData: null, // Placeholder for map state sharing
                cobrowsingUrl: null, // Placeholder for Replit URL
            };

            const roomRef = window.firebase.doc(db, `artifacts/${appId}/public/data/jitsi_rooms`, roomNameSlug);
            await window.firebase.setDoc(roomRef, roomData);

            setNewRoomName('');
            setActiveRoom(roomNameSlug);
            setShowRoomView(false); // Switch to Jitsi view
        } catch (e) {
            console.error("Error creating room:", e);
            displayAlert(`Failed to create room: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [userId, db, newRoomName, displayName]);

    const handleJoinRoom = useCallback(async (roomId) => {
        if (!userId || !db) {
            displayAlert("Authentication not complete. Please wait a moment.");
            return;
        }
        setIsLoading(true);
        try {
            const roomRef = window.firebase.doc(db, `artifacts/${appId}/public/data/jitsi_rooms`, roomId);
            await window.firebase.updateDoc(roomRef, {
                users: window.firebase.arrayUnion(userId),
                lastActivity: Date.now()
            });

            setActiveRoom(roomId);
            setShowRoomView(false); // Switch to Jitsi view
        } catch (e) {
            console.error("Error joining room:", e);
            displayAlert(`Failed to join room: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [userId, db]);

    const handleLeaveRoom = useCallback(async () => {
        if (!activeRoom || !userId || !db) return;

        setIsLoading(true);
        try {
            const roomRef = window.firebase.doc(db, `artifacts/${appId}/public/data/jitsi_rooms`, activeRoom);
            await window.firebase.updateDoc(roomRef, {
                users: window.firebase.arrayRemove(userId),
                lastActivity: Date.now()
            });
            setActiveRoom(null);
            setShowRoomView(true); // Return to room list view
            setShowMap(false);
            setShowReplitView(false);

            // Clean up: if no users are left, mark as inactive
            const roomData = rooms.find(r => r.jitsiRoomId === activeRoom);
            if (roomData && roomData.users.length === 1 && roomData.users[0] === userId) {
                 await window.firebase.updateDoc(roomRef, { active: false });
            }

        } catch (e) {
            console.error("Error leaving room:", e);
            displayAlert(`Failed to leave room: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [activeRoom, userId, db, rooms]);

    const handleJitsiConferenceJoined = useCallback(() => {
        console.log("Jitsi Conference Joined");
        setIsLoading(false); // Make sure loading stops after join
    }, []);

    const handleJitsiConferenceLeft = useCallback(() => {
        console.log("Jitsi Conference Left by event");
        // Only handle if the user didn't intentionally click 'Leave' inside the app logic
        if (activeRoom) {
            handleLeaveRoom();
        }
    }, [activeRoom, handleLeaveRoom]);

    const handleDeleteRoom = useCallback(async (roomId) => {
        if (!db || !userId) return;

        const roomToDelete = rooms.find(r => r.jitsiRoomId === roomId);

        if (roomToDelete && roomToDelete.creatorId === userId) {
            if (window.confirm(`Are you sure you want to permanently delete the room: ${roomToDelete.name}?`)) {
                try {
                    await window.firebase.deleteDoc(window.firebase.doc(db, `artifacts/${appId}/public/data/jitsi_rooms`, roomId));
                    displayAlert(`Room "${roomToDelete.name}" deleted successfully.`);
                    if (activeRoom === roomId) {
                         setActiveRoom(null);
                         setShowRoomView(true);
                    }
                } catch (e) {
                    console.error("Error deleting room:", e);
                    displayAlert(`Failed to delete room: ${e.message}`);
                }
            }
        } else {
            displayAlert("You can only delete rooms you created.");
        }
    }, [db, userId, rooms, activeRoom]);


    const handleAnalyzeMapPrompt = async () => {
        if (!mapSearchPrompt.trim()) {
            setLlmSearchQueries([]);
            return;
        }

        setIsAnalyzing(true);
        try {
            const queries = await analyzeMapPrompt(mapSearchPrompt.trim());
            setLlmSearchQueries(queries);
        } catch (e) {
            displayAlert("Map analysis failed due to an API error.");
            setLlmSearchQueries(["Error during analysis."]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Placeholder Components for Enhanced Functionality
    const EnhancedFreeMap = () => (
        <Card className="w-full h-full flex flex-col min-h-[300px]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-lime-400" /> Interactive Map Simulation (Not Real)
            </h3>
            <p className="text-sm text-gray-400 mb-4">
                This is an interactive area to sketch or share map concepts. In a full implementation, this would be a synchronized map library (like Leaflet or Google Maps) shared with all users in the room.
            </p>
             <div className="flex-grow bg-green-950 rounded-xl border border-green-700 p-4 flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <MapPin className="w-10 h-10 mx-auto mb-2" />
                    <p>Map Placeholder - Imagine a shared, interactive map here.</p>
                </div>
            </div>

            <div className="mt-4">
                <h4 className="text-lg font-semibold text-white mb-2">Map Search Assistant (Gemini)</h4>
                <div className="flex space-x-2 mb-2">
                    <Input
                        value={mapSearchPrompt}
                        onChange={(e) => setMapSearchPrompt(e.target.value)}
                        placeholder="e.g., 'Find the best routes in the Alps' or 'Videos about urban planning in Tokyo'"
                        className="flex-grow"
                        disabled={isAnalyzing}
                    />
                    <Button onClick={handleAnalyzeMapPrompt} disabled={isAnalyzing} className="bg-lime-600 hover:bg-lime-700">
                        {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </Button>
                </div>
                {llmSearchQueries.length > 0 && (
                    <div className="mt-2 p-3 bg-green-900 rounded-lg text-sm">
                        <p className="text-lime-300 font-medium mb-1">Suggested Searches:</p>
                        <div className="flex flex-wrap gap-2">
                            {llmSearchQueries.map((query, index) => (
                                <a
                                    key={index}
                                    href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-green-700 text-gray-200 rounded-full hover:bg-green-600 transition duration-150 flex items-center"
                                >
                                    <Search className="w-3 h-3 mr-1" />
                                    {query}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );

    const ReplitCoBrowsingView = () => {
        // Placeholder for a Replit URL shared via Firestore or input
        const [replitUrl, setReplitUrl] = useState('');
        const [isInputVisible, setIsInputVisible] = useState(false);
        const [iframeLoaded, setIframeLoaded] = useState(false);

        const handleSetUrl = () => {
             if (replitUrl.trim()) {
                 setIframeLoaded(false); // Reset loading state
                 // In a real app, this URL would be saved to Firestore for all users
             }
             setIsInputVisible(false);
        };

        const currentUrl = replitUrl.startsWith('http') ? replitUrl : `https://${replitUrl}`;

        return (
            <Card className="w-full h-full flex flex-col min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center">
                         <ScreenShare className="w-5 h-5 mr-2 text-lime-400" /> Co-Browsing View (Replit)
                    </h3>
                    <Button
                        onClick={() => setIsInputVisible(!isInputVisible)}
                        variant="secondary"
                        size="sm"
                        className="bg-green-700 hover:bg-green-600 text-white"
                        title="Change Co-Browsing URL"
                    >
                        <Monitor className="w-4 h-4 mr-2" /> {isInputVisible ? 'Hide Input' : 'Edit URL'}
                    </Button>
                </div>

                {isInputVisible && (
                    <div className="flex space-x-2 mb-4">
                        <Input
                            value={replitUrl}
                            onChange={(e) => setReplitUrl(e.target.value)}
                            placeholder="Enter Replit URL (e.g., replit.com/@user/project)"
                            className="flex-grow"
                        />
                        <Button onClick={handleSetUrl} className="bg-amber-500 hover:bg-amber-600">
                            Set
                        </Button>
                    </div>
                )}

                {replitUrl ? (
                    <div className="flex-grow relative rounded-xl overflow-hidden border border-green-700">
                        {!iframeLoaded && (
                            <div className="absolute inset-0 bg-green-950/75 flex items-center justify-center text-white z-10">
                                <Loader2 className="w-8 h-8 mr-2 animate-spin text-lime-400" />
                                Loading Co-Browsing Target...
                            </div>
                        )}
                        {/* Note: Embedding external sites like Replit may be blocked by CSP/X-Frame-Options in some environments */}
                        <iframe
                            src={currentUrl}
                            title="Replit Co-Browsing"
                            className="w-full h-full bg-white"
                            onLoad={() => setIframeLoaded(true)}
                            onError={() => {
                                setIframeLoaded(true);
                                displayAlert("Failed to load the co-browsing URL. Check if the URL is correct or if embedding is allowed.");
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex-grow bg-green-950 rounded-xl border border-green-700 p-4 flex items-center justify-center text-center text-gray-500">
                        <p>Enter a Replit or other live collaboration URL above to share it with your meeting.</p>
                    </div>
                )}
            </Card>
        );
    };


    // --- Render Logic ---

    // Handle initial loading and user display name input
    if (!isAuthReady || isLoading) {
        return (
            <div className="min-h-screen bg-green-950 flex items-center justify-center p-4">
                <div className="flex items-center text-lime-400">
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    <p>Connecting to Collaboration Service...</p>
                </div>
            </div>
        );
    }

    if (!displayName) {
        return (
            <div className="min-h-screen bg-green-950 flex items-center justify-center p-4">
                <Card className="w-full max-w-sm text-center">
                    <h1 className="text-2xl font-bold text-white mb-6">Welcome to Jitsi Map App</h1>
                    <p className="text-gray-300 mb-4">What's your name for the meeting?</p>
                    <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your Display Name"
                        className="mb-4"
                    />
                    <Button onClick={() => displayName.trim() && setDisplayName(displayName.trim())} disabled={!displayName.trim()} className="w-full">
                        Start Collaboration
                    </Button>
                </Card>
            </div>
        );
    }

    const currentRoomData = rooms.find(r => r.jitsiRoomId === activeRoom);

    return (
        <div className="min-h-screen bg-green-950 font-sans text-white flex flex-col">
            <header className="p-4 bg-green-900 shadow-lg border-b border-green-700 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-lime-400 flex items-center">
                    <MapPin className="w-6 h-6 mr-2" />
                    Jitsi Map App
                </h1>
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400 hidden sm:inline">
                        Signed in as: <span className="font-medium text-lime-300">{displayName}</span>
                    </span>
                    <span className="text-xs text-gray-500 font-mono hidden md:inline">
                        User ID: {userId}
                    </span>
                    {activeRoom && (
                        <Button onClick={handleLeaveRoom} variant="destructive" size="sm">
                            <X className="w-4 h-4 mr-2" />
                            Leave Room
                        </Button>
                    )}
                </div>
            </header>

            <main className="flex-grow p-4 lg:p-8">
                {activeRoom ? (
                    <div className="grid lg:grid-cols-3 gap-6 h-full min-h-[calc(100vh-10rem)]">
                        {/* Jitsi Video Panel (Col 1 & 2 on large screens) */}
                        <div className={`lg:col-span-2 ${showRoomView || showMap || showReplitView ? 'hidden lg:block' : 'block'}`}>
                            <JitsiMeet
                                roomName={activeRoom}
                                displayName={displayName}
                                onConferenceJoined={handleJitsiConferenceJoined}
                                onConferenceLeft={handleJitsiConferenceLeft}
                            />
                        </div>

                        {/* Right Sidebar / Focused View */}
                        <div className={`lg:col-span-1 flex flex-col space-y-4 h-full ${showRoomView ? 'hidden lg:block' : 'block'}`}>

                            <Card className="p-4">
                                <h3 className="text-lg font-bold text-white mb-3">
                                    Room: <span className="text-lime-400">{currentRoomData?.name || activeRoom}</span>
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <Button
                                        onClick={() => { setShowRoomView(false); setShowMap(false); setShowReplitView(false); }}
                                        variant={!showRoomView && !showMap && !showReplitView ? 'default' : 'secondary'}
                                        size="sm"
                                    >
                                        <Play className="w-4 h-4 mr-2" /> Video Call
                                    </Button>
                                    <Button
                                        onClick={() => { setShowRoomView(false); setShowMap(true); setShowReplitView(false); }}
                                        variant={showMap ? 'default' : 'secondary'}
                                        size="sm"
                                    >
                                        <MapPin className="w-4 h-4 mr-2" /> Shared Map
                                    </Button>
                                     <Button
                                        onClick={() => { setShowRoomView(false); setShowMap(false); setShowReplitView(true); }}
                                        variant={showReplitView ? 'default' : 'secondary'}
                                        size="sm"
                                    >
                                        <ScreenShare className="w-4 h-4 mr-2" /> Co-Browsing
                                    </Button>
                                </div>

                                {currentRoomData && (
                                    <div className="text-sm text-gray-400 mt-2">
                                        <p>Users Active: <span className="text-lime-300">{currentRoomData.users.length}</span></p>
                                        <p>Created by: <span className="text-lime-300">{currentRoomData.creatorName}</span></p>
                                    </div>
                                )}
                            </Card>


                            {showMap && <EnhancedFreeMap />}
                            {showReplitView && <ReplitCoBrowsingView />}

                            {/* Mobile Back Button for Side Views */}
                             {(showMap || showReplitView) && (
                                 <Button
                                     onClick={() => { setShowMap(false); setShowReplitView(false); }}
                                     variant="outline"
                                     className="lg:hidden w-full mt-4 border-green-500 text-green-500"
                                 >
                                    <ChevronDown className="w-4 h-4 mr-2" /> Back to Video
                                 </Button>
                             )}
                        </div>

                        {/* Full-screen fallbacks for Mobile if Jitsi view is hidden */}
                         {(showMap || showReplitView) && (
                            <div className="lg:hidden col-span-3">
                                {showMap && <EnhancedFreeMap />}
                                {showReplitView && <ReplitCoBrowsingView />}
                            </div>
                        )}
                    </div>

                ) : (
                    // Room Listing View
                    <Card className="w-full max-w-4xl mx-auto p-6">
                        <h2 className="text-3xl font-bold text-lime-400 mb-6 flex items-center">
                            <List className="w-7 h-7 mr-3" /> Active Rooms
                        </h2>

                        {/* Create New Room Section */}
                        <div className="mb-8 p-4 bg-green-900/70 rounded-xl border border-green-700">
                            <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
                                <Plus className="w-5 h-5 mr-2" /> Create New Room
                            </h3>
                            <div className="flex space-x-3">
                                <Input
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    placeholder="Enter a descriptive room name (e.g., 'Project X Planning')"
                                    className="flex-grow"
                                    disabled={isLoading}
                                />
                                <Button onClick={handleCreateRoom} disabled={isLoading || !newRoomName.trim()} className="bg-lime-600 hover:bg-lime-700">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                                    Create & Join
                                </Button>
                            </div>
                        </div>

                        {/* Room List */}
                        <h3 className="text-2xl font-semibold text-white mb-4">Join an Existing Session ({rooms.length})</h3>
                        <div className="space-y-4">
                            {rooms.length === 0 ? (
                                <p className="text-gray-500 p-4 border border-green-800 rounded-xl bg-green-900/50">
                                    No active rooms found. Be the first to create one!
                                </p>
                            ) : (
                                rooms.map((room) => (
                                    <div key={room.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-green-900 rounded-xl shadow-md border border-green-700 hover:border-lime-500 transition duration-200">
                                        <div className="mb-2 sm:mb-0">
                                            <p className="text-lg font-semibold text-lime-300">{room.name}</p>
                                            <p className="text-xs text-gray-400">
                                                Created by: {room.creatorName} • Users: {room.users.length}
                                            </p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button onClick={() => handleJoinRoom(room.jitsiRoomId)} variant="secondary">
                                                <Play className="w-4 h-4 mr-2" /> Join
                                            </Button>
                                            {room.creatorId === userId && (
                                                <Button
                                                    onClick={() => handleDeleteRoom(room.jitsiRoomId)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-400 hover:bg-red-900/50"
                                                    title="Delete Room"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                )}
            </main>

            {showErrorModal && (
                <div className="fixed inset-0 bg-green-950/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-green-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-green-700">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                                <AlertCircle className="w-6 h-6 text-lime-500 mr-3" />
                                <h2 className="text-white text-xl font-semibold">Error</h2>
                            </div>
                            <Button onClick={() => setShowErrorModal(false)} variant="ghost" size="icon" className="text-gray-400 hover:bg-green-700/50">
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
};

export default App;
