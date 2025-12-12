/**
 * Store層: Firebaseとの通信（Firestore/Storage）
 */
const Store = {
    app: null,
    db: null,
    storage: null,
    auth: null,

    /**
     * Firebaseを初期化
     * @param {Object} config - Firebase設定
     * @returns {boolean} - 初期化成功/失敗
     */
    initialize(config) {
        try {
            const { initializeApp } = window.firebaseApp;
            const { getFirestore } = window.firebaseFirestore;
            const { getStorage } = window.firebaseStorage;
            const { getAuth } = window.firebaseAuth;

            // Firebase初期化
            this.app = initializeApp(config);
            this.db = getFirestore(this.app);
            this.storage = getStorage(this.app);
            this.auth = getAuth(this.app);

            console.log('Firebase初期化成功');
            return true;
        } catch (error) {
            console.error('Firebase初期化エラー:', error);
            return false;
        }
    },

    /**
     * 記事を保存
     * @param {string} date - 日付 (YYYY-MM-DD形式)
     * @param {Object} data - 記事データ
     * @returns {Promise<boolean>}
     */
    async saveEntry(date, data) {
        if (!this.db) {
            throw new Error('Firestoreが初期化されていません');
        }

        try {
            const { doc, setDoc } = window.firebaseFirestore;
            const loginInfo = Auth.loadLoginInfo();
            
            if (!loginInfo || !loginInfo.uid) {
                throw new Error('ログインしていません');
            }

            // ユーザーごとのコレクションに保存
            const docRef = doc(this.db, 'users', loginInfo.uid, 'entries', date);
            await setDoc(docRef, {
                text: data.text || '',
                mood: data.mood !== null ? data.mood : null,
                color: data.color !== undefined ? data.color : 0,
                images: data.images || [],
                updatedAt: new Date().toISOString()
            });

            console.log('記事を保存しました:', date);
            return true;
        } catch (error) {
            console.error('記事の保存エラー:', error);
            throw error;
        }
    },

    /**
     * 記事を読み込み
     * @param {string} date - 日付 (YYYY-MM-DD形式)
     * @returns {Promise<Object|null>}
     */
    async loadEntry(date) {
        if (!this.db) {
            throw new Error('Firestoreが初期化されていません');
        }

        try {
            const { doc, getDoc } = window.firebaseFirestore;
            const loginInfo = Auth.loadLoginInfo();
            
            if (!loginInfo || !loginInfo.uid) {
                throw new Error('ログインしていません');
            }

            const docRef = doc(this.db, 'users', loginInfo.uid, 'entries', date);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log('記事を読み込みました:', date);
                return docSnap.data();
            } else {
                console.log('記事が存在しません:', date);
                return null;
            }
        } catch (error) {
            console.error('記事の読み込みエラー:', error);
            throw error;
        }
    },

    /**
     * 記事を削除
     * @param {string} date - 日付 (YYYY-MM-DD形式)
     * @returns {Promise<boolean>}
     */
    async deleteEntry(date) {
        if (!this.db) {
            throw new Error('Firestoreが初期化されていません');
        }

        try {
            const { doc, deleteDoc } = window.firebaseFirestore;
            const loginInfo = Auth.loadLoginInfo();
            
            if (!loginInfo || !loginInfo.uid) {
                throw new Error('ログインしていません');
            }

            const docRef = doc(this.db, 'users', loginInfo.uid, 'entries', date);
            await deleteDoc(docRef);

            console.log('記事を削除しました:', date);
            return true;
        } catch (error) {
            console.error('記事の削除エラー:', error);
            throw error;
        }
    },

    /**
     * 指定月の記事を取得
     * @param {number} year - 年
     * @param {number} month - 月 (1-12)
     * @returns {Promise<Object>} - {date: data} の形式
     */
    async getEntriesForMonth(year, month) {
        if (!this.db) {
            throw new Error('Firestoreが初期化されていません');
        }

        try {
            const { collection, query, where, getDocs } = window.firebaseFirestore;
            const loginInfo = Auth.loadLoginInfo();
            
            if (!loginInfo || !loginInfo.uid) {
                throw new Error('ログインしていません');
            }

            // 月の開始日と終了日
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

            const entriesRef = collection(this.db, 'users', loginInfo.uid, 'entries');
            const q = query(
                entriesRef,
                where('__name__', '>=', startDate),
                where('__name__', '<=', endDate)
            );

            const querySnapshot = await getDocs(q);
            const entries = {};

            querySnapshot.forEach((doc) => {
                entries[doc.id] = doc.data();
            });

            console.log(`${year}年${month}月の記事を取得しました:`, Object.keys(entries).length, '件');
            return entries;
        } catch (error) {
            console.error('記事の取得エラー:', error);
            throw error;
        }
    },

    /**
     * 画像をアップロード
     * @param {File} file - 画像ファイル
     * @param {string} path - 保存パス
     * @returns {Promise<string>} - ダウンロードURL
     */
    async uploadImage(file, path) {
        if (!this.storage) {
            throw new Error('Storageが初期化されていません');
        }

        try {
            const { ref, uploadBytes, getDownloadURL } = window.firebaseStorage;
            const storageRef = ref(this.storage, path);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            console.log('画像をアップロードしました:', path);
            return downloadURL;
        } catch (error) {
            console.error('画像のアップロードエラー:', error);
            throw error;
        }
    },

    /**
     * 画像を削除
     * @param {string} path - 削除する画像のパス
     * @returns {Promise<boolean>}
     */
    async deleteImage(path) {
        if (!this.storage) {
            throw new Error('Storageが初期化されていません');
        }

        try {
            const { ref, deleteObject } = window.firebaseStorage;
            const storageRef = ref(this.storage, path);
            
            await deleteObject(storageRef);

            console.log('画像を削除しました:', path);
            return true;
        } catch (error) {
            console.error('画像の削除エラー:', error);
            throw error;
        }
    }
};
