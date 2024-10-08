// Handle prefixed versions
navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

// State
var me = {};
var myStream;
var peers = {};

init();

// Start everything up
function init() {
  if (!navigator.getUserMedia) return unsupported();

  getLocalAudioStream(function (err, stream) {
    if (err || !stream) return;

    connectToPeerJS(function (err) {
      if (err) return;

      registerIdWithServer(me.id);
      displayMicToggle()
      if (call.peers.length) callPeers();
      else displayShareMessage();
    });
  });
}

// Connect to PeerJS and get an ID
function connectToPeerJS(cb) {
  display('Connecting to PeerJS...');
  me = new Peer({
    key: API_KEY,
    config: {
      iceServers: [
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "86206efe2abcd483316919f7",
          credential: "4uxXuuoTvoYhs4o9",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "86206efe2abcd483316919f7",
          credential: "4uxXuuoTvoYhs4o9",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "86206efe2abcd483316919f7",
          credential: "4uxXuuoTvoYhs4o9",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "86206efe2abcd483316919f7",
          credential: "4uxXuuoTvoYhs4o9",
        }
      ]
    }
  });

  me.on('call', handleIncomingCall);

  me.on('open', function () {
    display('Connected.');
    display('ID: ' + me.id);
    cb && cb(null, me);
  });

  me.on('error', function (err) {
    display(err);
    cb && cb(err);
  });
}

// Add our ID to the list of PeerJS IDs for this call
function registerIdWithServer() {
  display('Registering ID with server...');
  $.post('/' + call.id + '/addpeer/' + me.id);
}

// Remove our ID from the call's list of IDs
function unregisterIdWithServer() {
  $.post('/' + call.id + '/removepeer/' + me.id);
}

// Call each of the peer IDs using PeerJS
function callPeers() {
  call.peers.forEach(callPeer);
}

function callPeer(peerId) {
  display('Calling ' + peerId + '...');
  var peer = getPeer(peerId);
  peer.outgoing = me.call(peerId, myStream);

  peer.outgoing.on('error', function (err) {
    display(err);
  });

  peer.outgoing.on('stream', function (stream) {
    display('Connected to ' + peerId + '.');
    addIncomingStream(peer, stream);
  });
}

// When someone initiates a call via PeerJS
function handleIncomingCall(incoming) {
  display('Answering incoming call from ' + incoming.peer);
  var peer = getPeer(incoming.peer);
  peer.incoming = incoming;
  incoming.answer(myStream);
  peer.incoming.on('stream', function (stream) {
    addIncomingStream(peer, stream);
  });
}

// Add the new audio stream. Either from an incoming call, or
// from the response to one of our outgoing calls
function addIncomingStream(peer, stream) {
  display('Adding incoming stream from ' + peer.id);
  peer.incomingStream = stream;
  playStream(stream);
}

// Create an <audio> element to play the audio stream
function playStream(stream) {
  var audio = $('<audio autoplay />').appendTo('body');
  audio[0].srcObject = stream;
  audio[0].play();
}

// Get access to the microphone
function getLocalAudioStream(cb) {
  display('Trying to access your microphone. Please click "Allow".');

  navigator.getUserMedia(
    { video: false, audio: true },

    function success(audioStream) {
      display('Microphone is open.');
      myStream = audioStream;
      if (cb) cb(null, myStream);
    },

    function error(err) {
      display('Couldn\'t connect to microphone. Reload the page to try again.');
      if (cb) cb(err);
    }
  );
}

// Mute or unmute microphone
function toggleMic() {
  if (myStream.getAudioTracks().length) {
    myStream.getAudioTracks()[0].enabled = !myStream.getAudioTracks()[0].enabled;
    console.log(!myStream.getAudioTracks()[0].enabled)
    console.log(!myStream.getAudioTracks()[0].enabled ? 'Unmute Microphone' : 'Mute Microphone')
    $('#mic-toggle').html(!myStream.getAudioTracks()[0].enabled ? 'Unmute Microphone' : 'Mute Microphone');
  }
}



////////////////////////////////////
// Helper functions
function getPeer(peerId) {
  return peers[peerId] || (peers[peerId] = { id: peerId });
}

function displayShareMessage() {
  display('Give someone this URL to chat.');
  display('<input type="text" value="' + location.href + '" readonly>');

  $('#display input').click(function () {
    this.select();
  });
}

function displayMicToggle() {
  var mic = $('<button id="mic-toggle" />').html('Mute Microphone').appendTo('#display');
  mic.click(toggleMic);
}

function unsupported() {
  display("Your browser doesn't support getUserMedia.");
}

function display(message) {
  $('<div />').html(message).appendTo('#display');
}