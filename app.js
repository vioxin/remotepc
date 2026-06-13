// ご自身のRenderのURLに書き換えてください
const socket = io('https://ss-c7iw.onrender.com/');
const videoElement = document.getElementById('remoteVideo');
let dataChannel;

console.log("リモートデスクトップスクリプトを読み込みました。");

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const peerConnection = new RTCPeerConnection(configuration);

// 【追加】サーバーに接続できたら、Python側に「準備できたよ」と伝える
socket.on('connect', () => {
    console.log("シグナリングサーバーに接続しました。Pythonに準備完了を通知します...");
    socket.emit('message', { type: 'ready' });
});

// 映像が届いたらvideoタグに流し込む
peerConnection.ontrack = (event) => {
    console.log("映像ストリームを受信しました！画面を表示します。");
    videoElement.srcObject = event.streams[0];
    videoElement.play().catch(e => console.error("再生エラー:", e));
};

peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    console.log("操作用データチャネルが確立しました。");
};

// サーバーからメッセージが届いたときの処理
socket.on('message', async (message) => {
    if (message.type === 'offer') {
        console.log("PythonからOfferを受信しました。応答(Answer)を作成中...");
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        peerConnection.onicegatheringstatechange = () => {
            if (peerConnection.iceGatheringState === 'complete') {
                console.log("Answerを送信します。");
                socket.emit('message', {
                    type: peerConnection.localDescription.type,
                    sdp: peerConnection.localDescription.sdp
                });
            }
        };
        
        if (peerConnection.iceGatheringState === 'complete') {
            socket.emit('message', {
                type: peerConnection.localDescription.type,
                sdp: peerConnection.localDescription.sdp
            });
        }
    }
});

// 操作送信
videoElement.addEventListener('pointerdown', (e) => {
    if (dataChannel && dataChannel.readyState === 'open') {
        const rect = videoElement.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        dataChannel.send(JSON.stringify({ action: 'click', x: x, y: y }));
    }
});
