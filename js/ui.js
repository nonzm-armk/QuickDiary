/**
 * View層: 画面の表示・非表示の切り替え、DOM操作
 */
const View = {
    /**
     * 指定した画面を表示し、他の画面を非表示にする
     * @param {string} screenId - 表示する画面のID ('settings', 'calendar', 'editor')
     */
    showScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(`${screenId}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        // メニューを閉じる
        this.closeMenu();
    },

    /**
     * メニューを開く
     */
    openMenu() {
        const menuOverlay = document.getElementById('menu-overlay');
        if (menuOverlay) {
            menuOverlay.classList.add('active');
        }
    },

    /**
     * メニューを閉じる
     */
    closeMenu() {
        const menuOverlay = document.getElementById('menu-overlay');
        if (menuOverlay) {
            menuOverlay.classList.remove('active');
        }
    },

    /**
     * 日付表示を更新
     * @param {Date} date - 表示する日付
     */
    updateDateDisplay(date) {
        const dateDisplay = document.getElementById('current-date');
        if (dateDisplay) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateDisplay.textContent = `${year}/${month}/${day}`;
        }
    },

    /**
     * エディター画面にデータをセット（編集モード）
     * @param {Object} data - 記事データ
     */
    setEditorData(data) {
        // テキスト
        const textarea = document.getElementById('entry-text');
        if (textarea) {
            textarea.value = data.text || '';
        }

        // 気分スタンプ
        const moodButtons = document.querySelectorAll('.mood-btn');
        moodButtons.forEach((btn, index) => {
            if (index === data.mood) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // カラー
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach((btn, index) => {
            if (index === data.color) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 画像の表示
        if (data.images && data.images.length > 0) {
            this.displayImages(data.images);
        }
    },

    /**
     * エディター画面をクリア（新規モード）
     */
    clearEditor() {
        // テキスト
        const textarea = document.getElementById('entry-text');
        if (textarea) {
            textarea.value = '';
        }

        // 気分スタンプをクリア
        const moodButtons = document.querySelectorAll('.mood-btn');
        moodButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // カラーをデフォルト（赤）に設定
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach((btn, index) => {
            if (index === 0) { // 赤がデフォルト
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 画像のクリア
        this.clearImages();
    },

    /**
     * 画像プレビューを表示
     * @param {Array<string>} imageUrls - 画像URLの配列
     */
    displayImages(imageUrls) {
        const previewContainer = document.getElementById('image-preview');
        if (!previewContainer) return;

        previewContainer.innerHTML = '';
        
        imageUrls.forEach((url, index) => {
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'image-preview-item';
            imgWrapper.dataset.url = url;
            
            const img = document.createElement('img');
            img.src = url;
            img.alt = `画像 ${index + 1}`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'image-remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                if (window.App) {
                    window.App.removeImage(index);
                }
            };
            
            imgWrapper.appendChild(img);
            imgWrapper.appendChild(removeBtn);
            previewContainer.appendChild(imgWrapper);
        });
    },

    /**
     * 画像プレビューをクリア
     */
    clearImages() {
        const previewContainer = document.getElementById('image-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
    },

    /**
     * ローカルファイルから画像プレビューを表示
     * @param {Array<File>} files - 画像ファイルの配列
     */
    displayLocalImages(files) {
        const previewContainer = document.getElementById('image-preview');
        if (!previewContainer) return;

        previewContainer.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'image-preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = `画像 ${index + 1}`;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'image-remove-btn';
                removeBtn.innerHTML = '×';
                removeBtn.onclick = () => {
                    if (window.App) {
                        window.App.removeImage(index);
                    }
                };
                
                imgWrapper.appendChild(img);
                imgWrapper.appendChild(removeBtn);
                previewContainer.appendChild(imgWrapper);
            };
            
            reader.readAsDataURL(file);
        });
    },

    /**
     * エディター画面からデータを取得
     * @returns {Object} - 入力されたデータ
     */
    getEditorData() {
        // テキスト
        const textarea = document.getElementById('entry-text');
        const text = textarea ? textarea.value : '';

        // 気分スタンプ
        let mood = null;
        const moodButtons = document.querySelectorAll('.mood-btn');
        moodButtons.forEach((btn, index) => {
            if (btn.classList.contains('active')) {
                mood = index;
            }
        });

        // カラー
        let color = 0; // デフォルトは赤
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach((btn, index) => {
            if (btn.classList.contains('active')) {
                color = index;
            }
        });

        // 画像は別途管理（App.state.selectedImagesまたはApp.state.currentImageUrls）
        return {
            text,
            mood,
            color
        };
    },

    /**
     * カレンダーを描画
     * @param {number} year - 年
     * @param {number} month - 月 (0-11)
     * @param {Object} entries - その月の記事データ {date: data}
     */
    renderCalendar(year, month, entries = {}) {
        const calendarTitle = document.getElementById('calendar-title');
        if (calendarTitle) {
            calendarTitle.textContent = `${year}年${month + 1}月`;
        }

        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;

        // カレンダーをクリア
        calendarGrid.innerHTML = '';

        // 曜日ヘッダー
        const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            calendarGrid.appendChild(header);
        });

        // その月の1日
        const firstDay = new Date(year, month, 1);
        const firstDayOfWeek = firstDay.getDay();

        // その月の最終日
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // 前月の日付で埋める
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const dayCell = this.createDayCell(day, year, month - 1, true, entries);
            calendarGrid.appendChild(dayCell);
        }

        // 今月の日付
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = year === today.getFullYear() && 
                           month === today.getMonth() && 
                           day === today.getDate();
            const dayCell = this.createDayCell(day, year, month, false, entries, isToday);
            calendarGrid.appendChild(dayCell);
        }

        // 次月の日付で埋める
        const totalCells = firstDayOfWeek + daysInMonth;
        const remainingCells = 42 - totalCells; // 6週分
        for (let day = 1; day <= remainingCells; day++) {
            const dayCell = this.createDayCell(day, year, month + 1, true, entries);
            calendarGrid.appendChild(dayCell);
        }
    },

    /**
     * カレンダーの日付セルを作成
     * @param {number} day - 日
     * @param {number} year - 年
     * @param {number} month - 月
     * @param {boolean} isOtherMonth - 他の月かどうか
     * @param {Object} entries - 記事データ
     * @param {boolean} isToday - 今日かどうか
     * @returns {HTMLElement}
     */
    createDayCell(day, year, month, isOtherMonth, entries, isToday = false) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;

        if (isOtherMonth) {
            dayCell.classList.add('other-month');
        }

        if (isToday) {
            dayCell.classList.add('today');
        }

        // 記事データがあるかチェック
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (entries[dateKey]) {
            dayCell.classList.add('has-entry');
            const colorClass = this.getColorClass(entries[dateKey].color);
            dayCell.classList.add(colorClass);
        }

        // クリックイベント
        dayCell.addEventListener('click', () => {
            if (window.App) {
                window.App.handleDateSelect(year, month, day);
            }
        });

        return dayCell;
    },

    /**
     * カラーインデックスからCSSクラス名を取得
     * @param {number} colorIndex - カラーインデックス (0-4)
     * @returns {string}
     */
    getColorClass(colorIndex) {
        const colors = ['bg-red', 'bg-purple', 'bg-blue', 'bg-green', 'bg-yellow'];
        return colors[colorIndex] || 'bg-red';
    }
};
