// src/components/CobrowsingRecorderApp.jsx

import React from 'react';

// Use the actual Replit URL provided by the user
const REPLIT_APP_URL = 'https://geo-stream.replit.app/playback/c5eca37c-0e06-47ae-a96e-2ae1623e53fc?roomId=bdhOlu_XJu';

const CobrowsingRecorderApp = () => {
  return (
    <div className="w-full h-full bg-green-800">
      <iframe
        src={REPLIT_APP_URL}
        title="Cobrowsing and Video Recorder"
        className="w-full h-full border-none"
        // These permissions may be needed for the recorder to function within the iframe
        allow="camera; microphone; display-capture; fullscreen; geolocation"
      />
    </div>
  );
};

export default CobrowsingRecorderApp;