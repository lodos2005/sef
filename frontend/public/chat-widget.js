/**
 * SEF Embedded Chat Widget
 * Easy integration script for adding chat to any website
 * 
 * Usage Option 1 - With Session ID (Direct):
 * <script src="http://localhost:3000/chat-widget.js"></script>
 * <script>
 *   SefChat.init({
 *     sessionId: 'YOUR_SESSION_ID',
 *     baseUrl: 'http://localhost:3000',
 *   });
 * </script>
 * 
 * Usage Option 2 - Without Session ID (Chatbot Selection):
 * <script src="http://localhost:3000/chat-widget.js"></script>
 * <script>
 *   SefChat.init({
 *     baseUrl: 'http://localhost:3000',
 *     position: 'bottom-right',
 *     theme: 'light',
 *     width: 400,
 *     height: 600
 *   });
 * </script>
 */

(function() {
    'use strict';

    const SefChat = {
        config: {
            sessionId: null,
            baseUrl: window.location.origin,
            position: 'bottom-right',
            theme: 'light',
            width: 400,
            height: 600,
            buttonColor: '#0070f3',
            zIndex: 9999
        },

        init: function(options) {
            this.config = { ...this.config, ...options };
            
            // SessionId is now optional - widget will show chatbot selection if not provided
            
            // Eğer widget zaten varsa, sadece config'i güncelle ve return et
            const existingFab = document.getElementById('sef-chat-fab');
            const existingPopover = document.getElementById('sef-chat-popover');
            
            if (existingFab && existingPopover) {
                console.log('Widget already initialized, skipping...');
                return;
            }
            
            // Eğer kısmi elementler varsa temizle
            if (existingFab) existingFab.remove();
            if (existingPopover) existingPopover.remove();
            
            this.injectStyles();
            this.createWidget();
            this.attachEventListeners();
        },

        injectStyles: function() {
            const styles = `
                .sef-chat-fab {
                    position: fixed;
                    width: 60px;
                    height: 60px;
                    background: ${this.config.buttonColor};
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 112, 243, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    z-index: ${this.config.zIndex};
                    ${this.getPositionStyles('button')}
                }

                .sef-chat-fab:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(0, 112, 243, 0.5);
                }

                .sef-chat-fab svg {
                    width: 28px;
                    height: 28px;
                    fill: white;
                    transition: transform 0.3s ease;
                }

                .sef-chat-fab.active svg {
                    transform: rotate(45deg);
                }

                .sef-chat-popover {
                    position: fixed;
                    width: ${this.config.width}px;
                    height: ${this.config.height}px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                    overflow: hidden;
                    z-index: ${this.config.zIndex + 1};
                    opacity: 0;
                    transform: translateY(20px) scale(0.95);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: none;
                    ${this.getPositionStyles('popover')}
                }

                .sef-chat-popover.active {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    pointer-events: auto;
                }

                .sef-chat-popover iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                }

                @media (max-width: 480px) {
                    .sef-chat-popover {
                        width: calc(100vw - 40px);
                        height: calc(100vh - 100px);
                        left: 20px !important;
                        right: 20px !important;
                        bottom: 90px !important;
                    }
                }
            `;

            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        },

        getPositionStyles: function(type) {
            const positions = {
                'bottom-right': type === 'button' 
                    ? 'bottom: 20px; right: 20px;'
                    : 'bottom: 90px; right: 20px;',
                'bottom-left': type === 'button'
                    ? 'bottom: 20px; left: 20px;'
                    : 'bottom: 90px; left: 20px;',
                'top-right': type === 'button'
                    ? 'top: 20px; right: 20px;'
                    : 'top: 90px; right: 20px;',
                'top-left': type === 'button'
                    ? 'top: 20px; left: 20px;'
                    : 'top: 90px; left: 20px;'
            };
            return positions[this.config.position] || positions['bottom-right'];
        },

        createWidget: function() {
            // Create FAB button
            const fab = document.createElement('button');
            fab.className = 'sef-chat-fab';
            fab.id = 'sef-chat-fab';
            fab.innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
            `;
            fab.setAttribute('aria-label', 'Open chat');

            // Create popover
            const popover = document.createElement('div');
            popover.className = 'sef-chat-popover';
            popover.id = 'sef-chat-popover';
            
            const iframe = document.createElement('iframe');
            // If sessionId is provided, use direct link; otherwise use embed root for chatbot selection
            const embedUrl = this.config.sessionId 
                ? `${this.config.baseUrl}/chat/embed/${this.config.sessionId}`
                : `${this.config.baseUrl}/chat/embed/_`;
            iframe.src = embedUrl;
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('title', 'Chat Widget');
            
            popover.appendChild(iframe);

            // Add to DOM
            document.body.appendChild(fab);
            document.body.appendChild(popover);
        },

        attachEventListeners: function() {
            const fab = document.getElementById('sef-chat-fab');
            const popover = document.getElementById('sef-chat-popover');

            // Toggle chat
            fab.addEventListener('click', () => {
                const isActive = fab.classList.contains('active');
                fab.classList.toggle('active');
                popover.classList.toggle('active');
                
                // Dispatch events
                if (isActive) {
                    window.dispatchEvent(new CustomEvent('sef-chat-closed'));
                } else {
                    window.dispatchEvent(new CustomEvent('sef-chat-opened'));
                }
            });

            // Close on outside click
            document.addEventListener('click', (event) => {
                if (popover.classList.contains('active') &&
                    !popover.contains(event.target) &&
                    !fab.contains(event.target)) {
                    fab.classList.remove('active');
                    popover.classList.remove('active');
                    window.dispatchEvent(new CustomEvent('sef-chat-closed'));
                }
            });

            // Listen for messages from iframe
            window.addEventListener('message', (event) => {
                // Verify origin if needed
                if (event.origin !== this.config.baseUrl) return;

                if (event.data.type === 'chat-message-complete') {
                    // Trigger custom event
                    window.dispatchEvent(new CustomEvent('sef-chat-message', {
                        detail: event.data
                    }));
                }
                
                if (event.data.type === 'session-created') {
                    // Trigger custom event for new session creation
                    window.dispatchEvent(new CustomEvent('sef-session-created', {
                        detail: event.data
                    }));
                }
            });

            // Close on ESC key
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && popover.classList.contains('active')) {
                    fab.classList.remove('active');
                    popover.classList.remove('active');
                    window.dispatchEvent(new CustomEvent('sef-chat-closed'));
                }
            });
        },

        open: function() {
            const fab = document.getElementById('sef-chat-fab');
            const popover = document.getElementById('sef-chat-popover');
            if (fab && popover) {
                fab.classList.add('active');
                popover.classList.add('active');
                window.dispatchEvent(new CustomEvent('sef-chat-opened'));
            }
        },

        close: function() {
            const fab = document.getElementById('sef-chat-fab');
            const popover = document.getElementById('sef-chat-popover');
            if (fab && popover) {
                fab.classList.remove('active');
                popover.classList.remove('active');
                window.dispatchEvent(new CustomEvent('sef-chat-closed'));
            }
        },

        toggle: function() {
            const popover = document.getElementById('sef-chat-popover');
            if (popover && popover.classList.contains('active')) {
                this.close();
            } else {
                this.open();
            }
        }
    };

    // Expose to window
    window.SefChat = SefChat;

    // Auto-init if data attributes are present
    document.addEventListener('DOMContentLoaded', () => {
        const script = document.querySelector('script[data-sef-session-id]');
        if (script) {
            SefChat.init({
                sessionId: script.getAttribute('data-sef-session-id'),
                baseUrl: script.getAttribute('data-sef-base-url') || window.location.origin,
                position: script.getAttribute('data-sef-position') || 'bottom-right',
                width: parseInt(script.getAttribute('data-sef-width')) || 400,
                height: parseInt(script.getAttribute('data-sef-height')) || 600
            });
        }
    });
})();
