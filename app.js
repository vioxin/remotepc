const socket = io('https://ss-c7iw.onrender.com/');
const videoElement = document.getElementById('remoteVideo');
let dataChannel;

// WebRTCの設定（Googleの無料STUNサーバーを利用してNAT越え）
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const peerConnection = new RTCPeerConnection(configuration);

// 映像を受信したときの処理
peerConnection.ontrack = (event) => {
    console.log("映像ストリームを受信しました！");
    videoElement.srcObject = event.streams[0];
    // 強制的に再生を開始させる
    videoElement.play().catch(e => console.error("再生エラー:", e));
};

// シグナリングサーバーとの通信
socket.on('message', async (message) => {
    if (message.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('message', peerConnection.localDescription);
    } else if (message.type === 'candidate') {
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
});

// ICE Candidateの送信
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit('message', { type: 'candidate', candidate: event.candidate });
    }
};

// 操作データの送信（マウスやタップの処理）
videoElement.addEventListener('pointerdown', (e) => {
    if (dataChannel && dataChannel.readyState === 'open') {
        // ※実際には動画のサイズと実際のPCの解像度の比率計算が必要です
        const rect = videoElement.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        dataChannel.send(JSON.stringify({ action: 'click', x: x, y: y }));
    }
});
