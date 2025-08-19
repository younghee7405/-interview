// ===== 전역 변수 =====
let selectedFile = null;
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let recordedBlob = null;

// 프롬프트 관련 변수
let isEditing = false;
let isLargeFont = false;
let timer = null;
let seconds = 0;

const defaultPromptText = "안녕하세요, [이름]입니다. 저는 [전공/경험]을 바탕으로 [핵심 역량 1, 2]을 갖추고 있습니다. 최근에는 [프로젝트/인턴/성과]에서 [구체적 행동]을 통해 [수치/결과]를 만들었습니다. 이 경험을 바탕으로 귀사에서 [직무]로서 [가치 기여]를 실현하고 싶습니다. 감사합니다.";

// ===== DOM 요소 선택 =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 온보딩 관련
    initOnboarding();
    
    // 탭 기능
    initTabs();
    
    // 업로드 기능
    initUpload();
    
    // 웹캠 녹화 기능
    initWebcamRecording();
    
    // 프롬프트 기능
    initPrompt();
    
    // 분석 기능
    initAnalysis();
}

// ===== 온보딩 기능 =====
function initOnboarding() {
    const onboarding = document.getElementById('onboarding');
    const startUpload = document.getElementById('startUpload');
    const skipOnboarding = document.getElementById('skipOnboarding');
    const copyBtn = document.getElementById('copyScript');
    const baseScript = document.getElementById('baseScript');

    startUpload?.addEventListener('click', () => {
        document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
    });

    skipOnboarding?.addEventListener('click', () => {
        onboarding.style.display = 'none';
        document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
    });

    copyBtn?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(baseScript.value);
            copyBtn.textContent = '복사됨!';
            setTimeout(() => copyBtn.textContent = '복사', 1200);
        } catch(e) {
            alert('복사 실패: ' + e);
        }
    });
}

// ===== 탭 기능 =====
function initTabs() {
    const uploadTab = document.getElementById('uploadTab');
    const recordTab = document.getElementById('recordTab');
    const uploadContent = document.getElementById('uploadContent');
    const recordContent = document.getElementById('recordContent');

    uploadTab?.addEventListener('click', () => {
        uploadTab.classList.add('active');
        recordTab.classList.remove('active');
        uploadContent.classList.add('active');
        recordContent.classList.remove('active');
    });

    recordTab?.addEventListener('click', () => {
        recordTab.classList.add('active');
        uploadTab.classList.remove('active');
        recordContent.classList.add('active');
        uploadContent.classList.remove('active');
    });
}

// ===== 업로드 기능 =====
function initUpload() {
    const fileInput = document.getElementById('videoFile');
    const uploadZone = document.getElementById('uploadZone');
    const selectedFileDiv = document.getElementById('selectedFile');
    const analyzeBtn = document.getElementById('analyzeBtn');

    // 파일 선택 처리
    fileInput?.addEventListener('change', handleFileSelect);
    
    // 업로드 존 클릭 시 파일 선택
    uploadZone?.addEventListener('click', () => {
        fileInput.click();
    });

    // 드래그 앤 드롭
    uploadZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone?.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ target: { files } });
        }
    });

    function handleFileSelect(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        
        selectedFile = file;
        selectedFileDiv.style.display = 'block';
        selectedFileDiv.querySelector('.file-name').textContent = file.name;
        selectedFileDiv.querySelector('.file-size').textContent = formatFileSize(file.size);
        analyzeBtn.disabled = false;
    }
}

// ===== 웹캠 녹화 기능 =====
function initWebcamRecording() {
    const webcamPreview = document.getElementById('webcamPreview');
    const webcamOverlay = document.getElementById('webcamOverlay');
    const startWebcamBtn = document.getElementById('startWebcamBtn');
    const startRecordBtn = document.getElementById('startRecordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const stopWebcamBtn = document.getElementById('stopWebcamBtn');
    const recordingInfo = document.getElementById('recordingInfo');
    const recordingTime = document.getElementById('recordingTime');
    const recordingSize = document.getElementById('recordingSize');
    const selectedFileDiv = document.getElementById('selectedFile');
    const analyzeBtn = document.getElementById('analyzeBtn');

    // 웹캠 시작
    startWebcamBtn?.addEventListener('click', async () => {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720, facingMode: 'user' }, 
                audio: true 
            });
            
            webcamPreview.srcObject = mediaStream;
            webcamOverlay.classList.add('hidden');
            
            startWebcamBtn.style.display = 'none';
            startRecordBtn.style.display = 'inline-block';
            stopWebcamBtn.style.display = 'inline-block';
            
        } catch (error) {
            alert('웹캠 접근 권한이 필요합니다. 브라우저 설정에서 카메라와 마이크 권한을 허용해주세요.');
            console.error('웹캠 접근 오류:', error);
        }
    });

    // 녹화 시작
    startRecordBtn?.addEventListener('click', () => {
        if (!mediaStream) return;
        
        recordedChunks = [];
        recordingSeconds = 0;
        
        try {
            mediaRecorder = new MediaRecorder(mediaStream, {
                mimeType: 'video/webm;codecs=vp9,opus'
            });
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                    // 실시간 크기 업데이트
                    const totalSize = recordedChunks.reduce((size, chunk) => size + chunk.size, 0);
                    recordingSize.textContent = (totalSize / 1024 / 1024).toFixed(1) + ' MB';
                }
            };
            
            mediaRecorder.onstop = () => {
                recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
                
                // 녹화된 파일을 selectedFile로 설정
                selectedFile = new File([recordedBlob], `recorded_${Date.now()}.webm`, { type: 'video/webm' });
                
                // 파일 정보 표시
                selectedFileDiv.style.display = 'block';
                selectedFileDiv.querySelector('.file-name').textContent = selectedFile.name;
                selectedFileDiv.querySelector('.file-size').textContent = formatFileSize(selectedFile.size);
                
                // 분석 버튼 활성화
                analyzeBtn.disabled = false;
                
                alert('녹화가 완료되었습니다! 이제 분석을 시작할 수 있습니다.');
            };
            
            mediaRecorder.start(100); // 100ms마다 데이터 수집
            
            // UI 업데이트
            startRecordBtn.style.display = 'none';
            stopRecordBtn.style.display = 'inline-block';
            recordingInfo.style.display = 'flex';
            
            // 타이머 시작
            recordingTimer = setInterval(() => {
                recordingSeconds++;
                const mins = Math.floor(recordingSeconds / 60);
                const secs = recordingSeconds % 60;
                recordingTime.textContent = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
            }, 1000);
            
        } catch (error) {
            alert('녹화 시작 중 오류가 발생했습니다: ' + error.message);
            console.error('녹화 오류:', error);
        }
    });

    // 녹화 중지
    stopRecordBtn?.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        
        // UI 업데이트
        stopRecordBtn.style.display = 'none';
        startRecordBtn.style.display = 'inline-block';
        recordingInfo.style.display = 'none';
    });

    // 웹캠 종료
    stopWebcamBtn?.addEventListener('click', () => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        
        webcamPreview.srcObject = null;
        webcamOverlay.classList.remove('hidden');
        
        // 녹화 중이면 중지
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecordBtn.click();
        }
        
        // UI 리셋
        startWebcamBtn.style.display = 'inline-block';
        startRecordBtn.style.display = 'none';
        stopRecordBtn.style.display = 'none';
        stopWebcamBtn.style.display = 'none';
        recordingInfo.style.display = 'none';
    });
}

// ===== 프롬프트 기능 =====
function initPrompt() {
    const promptText = document.querySelector('.prompt-text');
    const editPromptBtn = document.getElementById('editPromptBtn');
    const fontSizeBtn = document.getElementById('fontSizeBtn');
    const resetPromptBtn = document.getElementById('resetPromptBtn');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const timerDisplay = document.getElementById('timerDisplay');

    // 프롬프트 수정 기능
    editPromptBtn?.addEventListener('click', () => {
        if (!isEditing) {
            // 수정 모드 시작
            const currentText = promptText.textContent.trim();
            promptText.innerHTML = `<textarea class="prompt-text editing">${currentText}</textarea>`;
            const textarea = promptText.querySelector('textarea');
            textarea.focus();
            textarea.select();
            editPromptBtn.textContent = '✅ 저장';
            isEditing = true;
            
            // 엔터키로 저장
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    editPromptBtn.click();
                }
            });
        } else {
            // 저장
            const textarea = promptText.querySelector('textarea');
            const newText = textarea.value.trim() || defaultPromptText;
            promptText.innerHTML = newText;
            editPromptBtn.textContent = '✏️ 수정';
            isEditing = false;
        }
    });

    // 글자 크기 변경
    fontSizeBtn?.addEventListener('click', () => {
        if (!isEditing) {
            isLargeFont = !isLargeFont;
            promptText.classList.toggle('large', isLargeFont);
            fontSizeBtn.textContent = isLargeFont ? '🔤 작게' : '🔤 크게';
        }
    });

    // 기본값 복원
    resetPromptBtn?.addEventListener('click', () => {
        if (confirm('기본 템플릿으로 되돌리시겠습니까?')) {
            promptText.innerHTML = defaultPromptText;
            if (isEditing) {
                editPromptBtn.textContent = '✏️ 수정';
                isEditing = false;
            }
        }
    });

    // 타이머 기능
    startTimerBtn?.addEventListener('click', () => {
        if (!timer) {
            // 타이머 시작
            seconds = 0;
            timer = setInterval(() => {
                seconds++;
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                timerDisplay.textContent = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
            }, 1000);
            startTimerBtn.textContent = '⏹️ 정지';
            timerDisplay.classList.add('timer-active');
        } else {
            // 타이머 정지
            clearInterval(timer);
            timer = null;
            startTimerBtn.textContent = '⏱️ 타이머';
            timerDisplay.classList.remove('timer-active');
        }
    });
}

// ===== 분석 기능 =====
function initAnalysis() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const demoBtn = document.getElementById('demoBtn');

    analyzeBtn?.addEventListener('click', () => {
        if (!selectedFile) return;
        analyzeVideo();
    });

    demoBtn?.addEventListener('click', runDemo);
}

async function analyzeVideo() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    analyzeBtn.textContent = '🔄 분석 중...';
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add('analyzing');

    try {
        // Flask API 호출
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: selectedFile.name,
                size: selectedFile.size
            })
        });

        if (!response.ok) {
            throw new Error('분석 요청 실패');
        }

        const data = await response.json();
        showResults(data.results, data.tips);

    } catch (error) {
        alert('분석 중 오류가 발생했습니다: ' + error.message);
        console.error('분석 오류:', error);
    } finally {
        analyzeBtn.textContent = '🔍 분석 시작하기';
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove('analyzing');
    }
}

function showResults(results, tips) {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    animateResults(results, tips);
}

function animateResults(results, tips) {
    // 전체 점수 애니메이션
    animateValue('totalScore', 0, results.totalScore, 1800);

    // 각 메트릭 순차 애니메이션
    setTimeout(() => {
        document.getElementById('wpmValue').textContent = results.wpm + ' WPM';
        document.getElementById('wpmProgress').style.width = Math.min(100, (results.wpm / 180) * 100) + '%';
    }, 300);

    setTimeout(() => {
        document.getElementById('volumeValue').textContent = results.volume + '%';
        document.getElementById('volumeProgress').style.width = results.volume + '%';
    }, 550);

    setTimeout(() => {
        document.getElementById('gazeValue').textContent = results.gaze + '%';
        document.getElementById('gazeProgress').style.width = results.gaze + '%';
    }, 800);

    setTimeout(() => {
        document.getElementById('postureValue').textContent = results.posture + '%';
        document.getElementById('postureProgress').style.width = results.posture + '%';
    }, 1050);

    setTimeout(() => {
        document.getElementById('expressionValue').textContent = results.expression + '%';
        document.getElementById('expressionProgress').style.width = results.expression + '%';
    }, 1300);

    setTimeout(() => {
        document.getElementById('environmentValue').textContent = results.environment.toFixed(1) + '점';
        document.getElementById('environmentProgress').style.width = (results.environment / 5) * 100 + '%';
    }, 1550);

    // 추가 메트릭
    setTimeout(() => {
        document.getElementById('fillerValue').textContent = results.filler + '%';
        document.getElementById('fillerProgress').style.width = results.filler + '%';
    }, 1700);

    setTimeout(() => {
        document.getElementById('silenceValue').textContent = results.silence + '%';
        document.getElementById('silenceProgress').style.width = results.silence + '%';
    }, 1850);

    setTimeout(() => {
        document.getElementById('endingValue').textContent = results.ending + '%';
        document.getElementById('endingProgress').style.width = results.ending + '%';
    }, 2000);

    setTimeout(() => {
        document.getElementById('smileValue').textContent = results.smile + '%';
        document.getElementById('smileProgress').style.width = results.smile + '%';
    }, 2150);

    setTimeout(() => {
        document.getElementById('headMoveValue').textContent = results.headMove + '%';
        document.getElementById('headMoveProgress').style.width = results.headMove + '%';
    }, 2300);

    setTimeout(() => {
        document.getElementById('blinkValue').textContent = results.blinkPerMin + '/min';
        const pct = Math.min(100, (results.blinkPerMin / 20) * 100);
        document.getElementById('blinkProgress').style.width = pct + '%';
    }, 2450);

    setTimeout(() => showCoachingTips(tips), 2600);
}

function animateValue(id, start, end, duration) {
    const el = document.getElementById(id);
    const startTime = performance.now();
    
    function update(currentTime) {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const current = start + (end - start) * progress;
        el.textContent = (id === 'totalScore' ? current.toFixed(1) : Math.round(current));
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function showCoachingTips(tips) {
    const tipsContainer = document.getElementById('coachingTips');
    tipsContainer.innerHTML = '';
    
    tips.forEach((tip, i) => {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'tip-item';
            el.textContent = tip;
            tipsContainer.appendChild(el);
        }, i * 350);
    });
}

function runDemo() {
    selectedFile = { name: 'demo_presentation.mp4', size: 15 * 1024 * 1024 };
    const selectedFileDiv = document.getElementById('selectedFile');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    selectedFileDiv.style.display = 'block';
    selectedFileDiv.querySelector('.file-name').textContent = 'demo_presentation.mp4';
    selectedFileDiv.querySelector('.file-size').textContent = '15.0 MB';
    analyzeBtn.disabled = false;
    
    setTimeout(() => analyzeVideo(), 400);
}

// ===== 유틸리티 함수 =====
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
