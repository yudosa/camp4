// 게임 상태 관리
class EscapeRoomGame {
    constructor() {
        this.socket = io();
        this.currentCode = '';
        this.correctCode = '851216'; // 6자리 비밀번호
        this.startTime = Date.now();
        this.gameCompleted = false;
        this.timerInterval = null;
        this.isMobile = this.detectMobile();
        
        this.initializeElements();
        this.initializeSocket();
        this.initializeEventListeners();
        this.startTimer();
        this.setupMobileOptimizations();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    }

    setupMobileOptimizations() {
        if (this.isMobile) {
            // 모바일에서 뷰포트 높이 설정
            const setVH = () => {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            };
            
            setVH();
            window.addEventListener('resize', setVH);
            window.addEventListener('orientationchange', setVH);
            
            // 터치 이벤트 최적화
            document.addEventListener('touchstart', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    }

    initializeElements() {
        this.lockDisplay = document.getElementById('lock-code');
        this.timerDisplay = document.getElementById('timer');
        this.treasureBox = document.getElementById('treasure-box');
        this.boxLid = document.querySelector('.box-lid');
        this.problemBtn = document.getElementById('problem-btn');
        this.problemModal = document.getElementById('problem-modal');
        this.successModal = document.getElementById('success-modal');
        this.failureModal = document.getElementById('failure-modal');
        this.explosion = document.getElementById('explosion');
    }

    initializeSocket() {
        // 연결 상태 관리
        this.socket.on('connect', () => {
            console.log('서버에 연결되었습니다.');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('서버 연결이 끊어졌습니다.');
            this.updateConnectionStatus(false);
        });

        this.socket.on('connect_error', (error) => {
            console.error('연결 오류:', error);
            this.updateConnectionStatus(false);
        });

        // 게임 이벤트 처리
        this.socket.on('game-started', (data) => {
            console.log('게임이 시작되었습니다:', data);
        });

        this.socket.on('game-ended', (data) => {
            console.log('게임이 종료되었습니다:', data);
        });
    }

    initializeEventListeners() {
        // 키패드 버튼 이벤트 (터치 최적화)
        const lockButtons = document.querySelectorAll('.lock-btn');
        console.log('Found lock buttons:', lockButtons.length);
        
        lockButtons.forEach((btn, index) => {
            console.log(`Button ${index}:`, btn.textContent, 'data-digit:', btn.dataset.digit);
            
            // 클릭 이벤트
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked:', btn.textContent);
                this.handleLockButton(btn);
            });
            
            // 터치 이벤트
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button touched:', btn.textContent);
                this.handleLockButton(btn);
            }, { passive: false });
            
            // 터치 엔드 이벤트 (버튼 피드백)
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.addButtonFeedback(btn);
            }, { passive: false });
        });

        // 문제보기 버튼
        this.problemBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showProblemModal();
        });
        
        this.problemBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showProblemModal();
        }, { passive: false });

        // 모달 닫기 버튼들
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = btn.closest('.modal');
                this.closeModal(modal);
            });
            
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = btn.closest('.modal');
                this.closeModal(modal);
            }, { passive: false });
        });

        // 모달 배경 클릭으로 닫기
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
            
            modal.addEventListener('touchstart', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            }, { passive: false });
        });

        // 다시 시도 버튼 이벤트 (Added)
        const retryBtn = document.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(this.failureModal);
            });
            
            retryBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(this.failureModal);
            }, { passive: false });
        }

        // 성공 모달 확인 버튼 이벤트 (Added)
        const successBtn = document.querySelector('.success-btn');
        if (successBtn) {
            successBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(this.successModal);
            });
            successBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(this.successModal);
            }, { passive: false });
        }

        // 키보드 이벤트 (모바일이 아닐 때만)
        if (!this.isMobile) {
            document.addEventListener('keydown', (e) => {
                this.handleKeyboardInput(e);
            });
        }

        // 화면 회전 및 리사이즈 이벤트
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateLayout();
            }, 100);
        });

        // 리사이즈 이벤트
        window.addEventListener('resize', () => {
            this.updateLayout();
        });
    }

    handleLockButton(button) {
        const digit = button.dataset.digit;
        const isClear = button.classList.contains('clear-btn');
        const isEnter = button.classList.contains('enter-btn');
        const buttonText = button.textContent.trim();

        console.log('Button clicked:', buttonText, 'Digit:', digit, 'IsClear:', isClear, 'IsEnter:', isEnter);

        // 버튼 피드백 추가
        this.addButtonFeedback(button);

        if (isClear) {
            console.log('Clear button pressed');
            this.clearCode();
        } else if (isEnter) {
            console.log('Enter button pressed');
            this.submitCode();
        } else if (digit && this.currentCode.length < 6) {
            console.log('Digit button pressed:', digit);
            this.addDigit(digit);
        } else if (this.currentCode.length >= 6) {
            console.log('Code is full, cannot add more digits');
        } else {
            console.log('Unknown button pressed:', buttonText);
        }
    }

    handleKeyboardInput(e) {
        if (this.gameCompleted) return;

        console.log('Keyboard input:', e.key);

        if (e.key >= '0' && e.key <= '9' && this.currentCode.length < 6) {
            this.addDigit(e.key);
        } else if (e.key === 'Enter') {
            this.submitCode();
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            this.clearCode();
        }
    }

    addDigit(digit) {
        if (this.currentCode.length < 6) {
            this.currentCode += digit;
            console.log('Added digit:', digit, 'Current code:', this.currentCode);
            this.updateDisplay();
        }
    }

    clearCode() {
        this.currentCode = '';
        console.log('Code cleared');
        this.updateDisplay();
    }

    updateDisplay() {
        const displayText = this.currentCode.padEnd(6, '0');
        console.log('Updating display:', displayText);
        this.lockDisplay.textContent = displayText;
    }

    submitCode() {
        console.log('Submitting code:', this.currentCode, 'Correct code:', this.correctCode);
        
        if (this.currentCode.length !== 6) {
            console.log('Code length is not 6:', this.currentCode.length);
            this.handleFailure();
            return;
        }

        if (this.currentCode === this.correctCode) {
            console.log('Success!');
            this.handleSuccess();
        } else {
            console.log('Failure!');
            this.handleFailure();
        }

        this.currentCode = '';
        this.updateDisplay();
    }

    handleSuccess() {
        this.gameCompleted = true;
        this.stopTimer();
        
        // 축하 노래 재생
        this.playCelebrationSound();
        
        // 폭발 효과
        this.triggerExplosion();
        
        // 성공 모달 표시
        setTimeout(() => {
            this.showSuccessModal();
        }, 1000);
        
        // 로컬 스토리지에 완료 기록
        localStorage.setItem('escapeRoomCompleted', 'true');
        localStorage.setItem('escapeRoomTime', this.getElapsedTime().toString());
        
        // 서버에 성공 알림
        this.socket.emit('gameCompleted', {
            time: this.getElapsedTime(),
            timestamp: Date.now()
        });
    }

    playCelebrationSound() {
        const audio = document.getElementById('celebration-audio');
        if (audio) {
            // 볼륨을 적당히 설정 (0.0 ~ 1.0)
            audio.volume = 0.7;
            
            // 오디오 재생 시도
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('축하 노래 재생 시작');
                }).catch(error => {
                    console.log('오디오 재생 실패:', error);
                    // 사용자 상호작용이 필요한 경우를 위한 대체 처리
                    this.showAudioPlayButton();
                });
            }
        }
    }

    showAudioPlayButton() {
        // 오디오 재생이 차단된 경우 사용자에게 알림
        const audioBtn = document.createElement('button');
        audioBtn.textContent = '🎵 축하 노래 재생';
        audioBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        
        audioBtn.addEventListener('click', () => {
            const audio = document.getElementById('celebration-audio');
            if (audio) {
                audio.play().then(() => {
                    audioBtn.remove();
                }).catch(error => {
                    console.log('오디오 재생 실패:', error);
                });
            }
        });
        
        audioBtn.addEventListener('mouseenter', () => {
            audioBtn.style.transform = 'translateY(-2px)';
            audioBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
        });
        
        audioBtn.addEventListener('mouseleave', () => {
            audioBtn.style.transform = 'translateY(0)';
            audioBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });
        
        document.body.appendChild(audioBtn);
        
        // 10초 후 자동으로 제거
        setTimeout(() => {
            if (audioBtn.parentNode) {
                audioBtn.remove();
            }
        }, 10000);
    }

    handleFailure() {
        // 실패 애니메이션
        this.treasureBox.classList.add('shake');
        setTimeout(() => {
            this.treasureBox.classList.remove('shake');
        }, 500);

        // 모바일에서 진동
        if (this.isMobile && navigator.vibrate) {
            navigator.vibrate(200);
        }

        // 실패 모달 표시
        setTimeout(() => {
            this.showFailureModal();
        }, 300);
    }

    triggerExplosion() {
        this.explosion.style.display = 'block';
        this.explosion.classList.add('active');
        
        setTimeout(() => {
            this.explosion.classList.remove('active');
            setTimeout(() => {
                this.explosion.style.display = 'none';
            }, 1000);
        }, 2000);
    }

    showProblemModal() {
        this.problemModal.style.display = 'block';
        // 모바일에서 스크롤 방지
        if (this.isMobile) {
            document.body.style.overflow = 'hidden';
        }
        
        // 이미지 줌 기능 초기화
        this.initializeImageZoom();
    }

    initializeImageZoom() {
        const problemImage = document.querySelector('#problem-modal .problem-image img');
        if (!problemImage) return;

        let currentScale = 1;
        let initialDistance = 0;
        let initialScale = 1;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let translateX = 0;
        let translateY = 0;
        let lastTouchTime = 0;
        let isFullscreen = false;

        // 전체 화면 모드 토글 함수
        const toggleFullscreen = () => {
            console.log('Toggle fullscreen called, current state:', isFullscreen);
            
            if (isFullscreen) {
                // 전체 화면 해제
                problemImage.style.cssText = `
                    position: relative !important;
                    top: auto !important;
                    left: auto !important;
                    width: auto !important;
                    height: auto !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    z-index: 1 !important;
                    cursor: zoom-in !important;
                    background-color: transparent !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
                    transition: all 0.3s ease !important;
                    transform: none !important;
                    -webkit-transform: none !important;
                    pointer-events: auto !important;
                `;
                problemImage.classList.remove('fullscreen');
                currentScale = 1;
                translateX = 0;
                translateY = 0;
                isFullscreen = false;
                
                // 모달 배경 복원
                const modal = document.getElementById('problem-modal');
                if (modal) {
                    modal.style.zIndex = '1000';
                }
            } else {
                // 전체 화면으로 확대
                problemImage.style.cssText = `
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    max-width: none !important;
                    max-height: none !important;
                    object-fit: contain !important;
                    z-index: 9999 !important;
                    cursor: zoom-out !important;
                    background-color: rgba(0,0,0,0.95) !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                    transition: none !important;
                    transform: none !important;
                    -webkit-transform: none !important;
                    -webkit-user-select: none !important;
                    user-select: none !important;
                    pointer-events: auto !important;
                    -webkit-touch-callout: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                `;
                problemImage.classList.add('fullscreen');
                currentScale = 1;
                translateX = 0;
                translateY = 0;
                isFullscreen = true;
                
                // 모달 배경 숨김
                const modal = document.getElementById('problem-modal');
                if (modal) {
                    modal.style.zIndex = '9998';
                }
            }
        };

        // 클릭 이벤트 (전체 화면 토글) - 모든 기기
        problemImage.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Image clicked, toggling fullscreen');
            toggleFullscreen();
        });

        // 터치 이벤트 (핀치 줌)
        problemImage.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.touches.length === 2) {
                initialDistance = this.getDistance(e.touches[0], e.touches[1]);
                initialScale = currentScale;
            } else if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX - translateX;
                startY = e.touches[0].clientY - translateY;
            }
        }, { passive: false });

        problemImage.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.touches.length === 2) {
                const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
                const scale = (currentDistance / initialDistance) * initialScale;
                currentScale = Math.min(Math.max(scale, 0.5), 5);
                this.applyZoom(problemImage, currentScale, translateX, translateY);
            } else if (e.touches.length === 1 && isDragging && currentScale > 1) {
                translateX = e.touches[0].clientX - startX;
                translateY = e.touches[0].clientY - startY;
                this.applyZoom(problemImage, currentScale, translateX, translateY);
            }
        }, { passive: false });

        problemImage.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = false;
            
            // 더블 탭으로 리셋
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTouchTime;
            if (tapLength < 500 && tapLength > 0) {
                console.log('Double tap detected');
                if (isFullscreen) {
                    toggleFullscreen();
                } else {
                    currentScale = 1;
                    translateX = 0;
                    translateY = 0;
                    this.applyZoom(problemImage, currentScale, translateX, translateY);
                }
            }
            lastTouchTime = currentTime;
        });

        // 마우스 휠 줌 (데스크톱)
        problemImage.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            currentScale = Math.min(Math.max(currentScale * delta, 0.5), 5);
            this.applyZoom(problemImage, currentScale, translateX, translateY);
        }, { passive: false });

        // 더블 클릭으로 리셋 (데스크톱)
        problemImage.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Double click detected');
            if (isFullscreen) {
                toggleFullscreen();
            } else {
                currentScale = 1;
                translateX = 0;
                translateY = 0;
                this.applyZoom(problemImage, currentScale, translateX, translateY);
            }
        });

        // 마우스 드래그 (데스크톱)
        problemImage.addEventListener('mousedown', (e) => {
            if (currentScale > 1) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                problemImage.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && currentScale > 1) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                this.applyZoom(problemImage, currentScale, translateX, translateY);
                e.preventDefault();
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            if (problemImage) {
                problemImage.style.cursor = currentScale > 1 ? 'grab' : 'zoom-in';
            }
        });

        // ESC 키로 전체 화면 해제
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                console.log('ESC key pressed, exiting fullscreen');
                toggleFullscreen();
            }
        });

        // 모달이 닫힐 때 줌 리셋
        const modal = document.getElementById('problem-modal');
        const observer = new MutationObserver(() => {
            if (modal.style.display === 'none') {
                currentScale = 1;
                translateX = 0;
                translateY = 0;
                isFullscreen = false;
                this.applyZoom(problemImage, currentScale, translateX, translateY);
                problemImage.style.cssText = `
                    position: relative !important;
                    top: auto !important;
                    left: auto !important;
                    width: auto !important;
                    height: auto !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    z-index: 1 !important;
                    cursor: zoom-in !important;
                    background-color: transparent !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
                    transition: all 0.3s ease !important;
                    transform: none !important;
                    -webkit-transform: none !important;
                `;
                problemImage.classList.remove('fullscreen');
            }
        });
        observer.observe(modal, { attributes: true, attributeFilter: ['style'] });

        // 이미지 로드 완료 후 초기화
        if (problemImage.complete) {
            this.initializeImageSize(problemImage);
        } else {
            problemImage.addEventListener('load', () => {
                this.initializeImageSize(problemImage);
            });
        }

        // 모든 기기에서 돋보기 커서 설정
        if (!isFullscreen) {
            problemImage.style.cursor = 'zoom-in';
        }

        // 터치 이벤트로도 커서 설정
        problemImage.addEventListener('touchstart', () => {
            if (!isFullscreen) {
                problemImage.style.cursor = 'zoom-in';
            }
        }, { passive: true });
    }

    initializeImageSize(image) {
        // 이미지가 컨테이너에 맞춰 표시되도록 설정
        const container = image.parentElement;
        if (container) {
            // 이미지가 컨테이너보다 크면 축소, 작으면 확대
            image.style.maxWidth = '100%';
            image.style.maxHeight = '100%';
            image.style.width = 'auto';
            image.style.height = 'auto';
            image.style.objectFit = 'contain';
        }
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    applyZoom(image, scale, translateX = 0, translateY = 0) {
        // 줌 레벨에 따라 커서 변경
        if (scale > 1) {
            image.style.cursor = 'grab';
        } else {
            image.style.cursor = 'zoom-in';
        }
        
        // 변환 적용
        image.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        image.style.transformOrigin = 'center center';
        
        // 부드러운 전환 효과
        if (scale === 1) {
            image.style.transition = 'transform 0.3s ease-out';
        } else {
            image.style.transition = 'transform 0.1s ease-out';
        }
        
        // 줌 상태에 따른 추가 스타일
        if (scale > 1) {
            image.style.zIndex = '1000';
            image.style.position = 'relative';
        } else {
            image.style.zIndex = '1';
            image.style.position = 'relative';
        }
        
        // 부모 컨테이너의 overflow 설정
        const container = image.parentElement;
        if (container) {
            if (scale > 1) {
                container.style.overflow = 'auto';
            } else {
                container.style.overflow = 'auto';
            }
        }
    }

    showSuccessModal() {
        this.successModal.style.display = 'block';
        if (this.isMobile) {
            document.body.style.overflow = 'hidden';
        }
    }

    showFailureModal() {
        this.failureModal.style.display = 'block';
        if (this.isMobile) {
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (modal === this.successModal) {
            // 성공 모달을 닫을 때 축하 노래도 멈춤
            this.stopCelebrationSound();
        }
        
        modal.style.display = 'none';
        if (this.isMobile) {
            document.body.style.overflow = 'auto';
        }
        
        // 문제 모달이 닫힐 때 이미지 줌 리셋
        if (modal === this.problemModal) {
            const problemImage = document.querySelector('#problem-modal .problem-image img');
            if (problemImage) {
                problemImage.style.transform = 'scale(1)';
            }
        }
    }

    stopCelebrationSound() {
        const audio = document.getElementById('celebration-audio');
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            console.log('축하 노래 중지');
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = this.getElapsedTime();
            this.timerDisplay.textContent = this.formatTime(elapsed);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getElapsedTime() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateConnectionStatus(isOnline) {
        // 연결 상태 표시 (선택사항)
        console.log('연결 상태:', isOnline ? '온라인' : '오프라인');
    }

    addButtonFeedback(button) {
        button.classList.add('pressed');
        setTimeout(() => {
            button.classList.remove('pressed');
        }, 150);
    }

    resetGame() {
        this.currentCode = '';
        this.correctCode = '851216';
        this.startTime = Date.now();
        this.gameCompleted = false;
        
        this.updateDisplay();
        this.timerDisplay.textContent = '00:00';
        
        this.treasureBox.classList.remove('success');
        this.boxLid.style.transform = '';
        
        this.startTimer();
        
        // 로컬 스토리지에서 성공 기록 제거
        localStorage.removeItem('escapeRoomCompleted');
        localStorage.removeItem('escapeRoomTime');
    }

    updateLayout() {
        // 모바일 최적화
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // 화면 크기에 따른 추가 최적화
        if (window.innerWidth <= 480) {
            // 작은 모바일 화면
            document.body.classList.add('small-mobile');
        } else if (window.innerWidth <= 768) {
            // 일반 모바일 화면
            document.body.classList.add('mobile');
        } else if (window.innerWidth <= 1024) {
            // 태블릿 화면
            document.body.classList.add('tablet');
        } else {
            // 데스크톱 화면
            document.body.classList.remove('small-mobile', 'mobile', 'tablet');
        }
    }
}

// 게임 초기화
document.addEventListener('DOMContentLoaded', () => {
    const game = new EscapeRoomGame();
    
    // 윈도우 리사이즈 이벤트
    window.addEventListener('resize', () => {
        game.updateLayout();
    });
    
    // 초기 레이아웃 설정
    game.updateLayout();
    
    // 성공 기록이 있으면 표시
    const completed = localStorage.getItem('escapeRoomCompleted');
    if (completed === 'true') {
        const time = localStorage.getItem('escapeRoomTime');
        console.log(`이전 기록: ${time}초`);
    }
});

// 레이아웃 업데이트 함수
function updateLayout() {
    // 모바일 최적화
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// 애니메이션 프레임 요청
function requestTick() {
    requestAnimationFrame(updateLayout);
}
