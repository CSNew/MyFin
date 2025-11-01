import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, updateDoc, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';

// --- Icons (Using Lucide-React pattern) ---
const Home = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const DollarSign = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const TrendingUp = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const Wallet = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h16v3"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14"/><path d="M7 15h1v-2H7v2Z"/></svg>;
const PiggyBank = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5c-1.5 0-2-1-3-1V2"/><path d="M11 2c-1.5 0-2 1-3 1v2"/><path d="M20 5v8c0 1.66-1.34 3-3 3H7"/><path d="M3 15h4v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V15z"/><path d="M3 12v3"/><path d="M15 11.5a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2z"/><path d="M7 16V5c0-1.5 1-2.5 2.5-3.5"/></svg>;
const ArrowUp = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>;
const ArrowDown = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>;
const BarChart3 = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;


// --- Constants ---
const INCOME_CATEGORIES = ['เงินเดือน', 'รายได้เสริม', 'โบนัส', 'ของขวัญ'];
const EXPENSE_CATEGORIES = ['อาหารและเครื่องดื่ม', 'ค่าเดินทาง', 'ช้อปปิ้ง', 'ค่าเช่า/ผ่อน', 'บิล/สาธารณูปโภค', 'อื่น ๆ'];
const INVESTMENT_DOC_ID = 'investment_data';

// --- Utility Functions ---
const formatCurrency = (amount) => {
   return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount);
};

const formatPercent = (rate) => {
   return (rate * 100).toFixed(1) + '%';
};

// --- Main App Component ---
const App = () => {
   // --- Firebase & Auth State ---
   const [db, setDb] = useState(null);
   const [auth, setAuth] = useState(null);
   const [userId, setUserId] = useState(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState('');

   // --- Application State ---
   const [activeTab, setActiveTab] = useState('dashboard');
   const [transactions, setTransactions] = useState([]);
   const [savingsGoals, setSavingsGoals] = useState([]);
   const [investmentData, setInvestmentData] = useState({
       expectedReturnRate: 0.10, // 10% (เป้าการลงทุนที่คาดหวัง)
       actualReturnAmount: 0,    // (ผลตอบแทนจริง)
       principal: 0,             // (เงินต้นที่ลงทุน)
   });
   const [showModal, setShowModal] = useState(false);
   const [modalMessage, setModalMessage] = useState('');

   const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
   const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

   // --- 1. Firebase Initialization & Authentication ---
   useEffect(() => {
       try {
           const app = initializeApp(firebaseConfig);
           const firestoreDb = getFirestore(app);
           const firebaseAuth = getAuth(app);
           setDb(firestoreDb);
           setAuth(firebaseAuth);

           const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
               if (user) {
                   setUserId(user.uid);
                   setIsLoading(false);
               } else {
                   // Sign in anonymously if no custom token is available
                   if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                       await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                   } else {
                       const anonUser = await signInAnonymously(firebaseAuth);
                       setUserId(anonUser.user.uid);
                   }
                   setIsLoading(false);
               }
           });

           return () => unsubscribe();
       } catch (e) {
           console.error("Firebase Initialization Error:", e);
           setError('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
           setIsLoading(false);
       }
   }, [firebaseConfig]);


   // --- 2. Data Fetching (Firestore Listeners) ---
   useEffect(() => {
       if (!db || !userId) return;

       const baseCollectionPath = `/artifacts/${appId}/users/${userId}`;

       // Listener for Transactions
       const transactionsColRef = collection(db, `${baseCollectionPath}/transactions`);
       const unsubscribeTransactions = onSnapshot(transactionsColRef, (snapshot) => {
           const fetchedTransactions = snapshot.docs.map(doc => ({
               id: doc.id,
               ...doc.data(),
               amount: Number(doc.data().amount), // Ensure number type
               date: doc.data().date ? doc.data().date : new Date().toISOString(), // Use ISO string for consistency
           })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
           setTransactions(fetchedTransactions);
       });

       // Listener for Savings Goals
       const savingsColRef = collection(db, `${baseCollectionPath}/savings_goals`);
       const unsubscribeSavings = onSnapshot(savingsColRef, (snapshot) => {
           const fetchedGoals = snapshot.docs.map(doc => ({
               id: doc.id,
               ...doc.data(),
               targetAmount: Number(doc.data().targetAmount || 0),
               currentAmount: Number(doc.data().currentAmount || 0),
           }));
           setSavingsGoals(fetchedGoals);
       });

       // Fetch Investment Data (Stored as a single config document)
       const fetchInvestmentData = async () => {
           try {
               const docRef = doc(db, `${baseCollectionPath}/config`, INVESTMENT_DOC_ID);
               const docSnap = await getDoc(docRef);
               if (docSnap.exists()) {
                   setInvestmentData(prev => ({ ...prev, ...docSnap.data() }));
               } else {
                   // Initialize if not exists
                   await setDoc(docRef, investmentData);
               }
           } catch (e) {
               console.error("Error fetching investment data:", e);
           }
       };
       fetchInvestmentData();


       return () => {
           unsubscribeTransactions();
           unsubscribeSavings();
       };

   }, [db, userId, appId]);

   // --- 3. Derived State and Calculations ---
   const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0), [transactions]);
   const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0), [transactions]);
   const netBalance = totalIncome - totalExpense;

   // Calculation for Monthly Summary
   const monthlySummary = useMemo(() => {
       const summary = transactions.reduce((acc, t) => {
           const date = new Date(t.date);
           // Key format YYYY-MM
           const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

           if (!acc[monthKey]) {
               acc[monthKey] = { income: 0, expense: 0, year: date.getFullYear(), month: date.getMonth() + 1 };
           }

           if (t.type === 'income') {
               acc[monthKey].income += t.amount;
           } else {
               acc[monthKey].expense += t.amount;
           }
           return acc;
       }, {});

       // Convert to an array and sort by latest month first
       return Object.keys(summary)
           .map(key => ({ ...summary[key], monthKey: key, net: summary[key].income - summary[key].expense }))
           .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

   }, [transactions]);

   // Helper function for Thai Month Names
   const getThaiMonthName = (monthIndex) => { // monthIndex is 1-12
       const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
       return months[monthIndex - 1];
   };


   // --- 4. Data Handlers (CRUD) ---

   // Function to show a temporary modal message
   const showMessage = (msg) => {
       setModalMessage(msg);
       setShowModal(true);
       setTimeout(() => setShowModal(false), 3000);
   };

   const addTransaction = async (type, data) => {
       if (!db || !userId) return showMessage('ฐานข้อมูลยังไม่พร้อม');
       try {
           const collectionRef = collection(db, `/artifacts/${appId}/users/${userId}/transactions`);
           await addDoc(collectionRef, {
               ...data,
               type,
               amount: Number(data.amount),
               date: new Date().toISOString(), // Store date as ISO string
               timestamp: Date.now()
           });
           showMessage(`${type === 'income' ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย'} สำเร็จ!`);
       } catch (e) {
           console.error("Error adding transaction:", e);
           showMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
       }
   };

   const addOrUpdateSavingsGoal = async (goal) => {
       if (!db || !userId) return showMessage('ฐานข้อมูลยังไม่พร้อม');
       try {
           const collectionRef = collection(db, `/artifacts/${appId}/users/${userId}/savings_goals`);
           if (goal.id) {
               await updateDoc(doc(collectionRef, goal.id), goal);
               showMessage('อัปเดตเป้าหมายการออมสำเร็จ');
           } else {
               await addDoc(collectionRef, {
                   ...goal,
                   currentAmount: Number(goal.currentAmount || 0),
                   targetAmount: Number(goal.targetAmount),
                   startDate: new Date().toISOString()
               });
               showMessage('สร้างเป้าหมายการออมสำเร็จ');
           }
       } catch (e) {
           console.error("Error saving goal:", e);
           showMessage('เกิดข้อผิดพลาดในการบันทึกเป้าหมาย');
       }
   };

   const updateInvestmentData = async (data) => {
       if (!db || !userId) return showMessage('ฐานข้อมูลยังไม่พร้อม');
       try {
           const docRef = doc(db, `/artifacts/${appId}/users/${userId}/config`, INVESTMENT_DOC_ID);
           const newData = {
               ...data,
               lastUpdate: new Date().toISOString().split('T')[0]
           };
           setInvestmentData(newData);
           await setDoc(docRef, newData, { merge: true });
           showMessage('อัปเดตข้อมูลการลงทุนสำเร็จ');
       } catch (e) {
           console.error("Error updating investment data:", e);
           showMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
       }
   };


   // --- 5. UI Components (Separated for clarity) ---

   const LoadingOverlay = () => (
       <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
           <p className="ml-4 text-indigo-600 text-lg">กำลังโหลด...</p>
       </div>
   );

   const Modal = ({ message }) => (
       <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 transition-opacity duration-300 p-4 rounded-xl shadow-2xl bg-indigo-600 text-white z-[60] ${showModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           {message}
       </div>
   );

   // Card component for dashboard summary
   const SummaryCard = ({ title, amount, icon: Icon, color, isNegative = false }) => (
       <div className={`p-4 rounded-2xl shadow-lg border border-opacity-20 ${color} flex items-center justify-between`}>
           <div>
               <p className="text-sm font-medium text-gray-700">{title}</p>
               <p className={`text-2xl font-bold mt-1 ${isNegative ? 'text-red-600' : 'text-gray-800'}`}>
                   {formatCurrency(amount)}
               </p>
           </div>
           <div className="p-3 bg-white/30 rounded-full">
               <Icon className="w-6 h-6 text-white"/>
           </div>
       </div>
   );

   // Simple Bar Chart for Income vs Expense
   const ExpenseChart = useCallback(({ totalIncome, totalExpense }) => {
       const total = totalIncome + totalExpense;
       const incomePercent = total > 0 ? (totalIncome / total) * 100 : 50;
       const expensePercent = total > 0 ? (totalExpense / total) * 100 : 50;

       return (
           <div className="mt-6 p-4 bg-white rounded-xl shadow-lg">
               <h3 className="text-xl font-semibold mb-3 text-gray-800">กราฟภาพรวมรายรับ-รายจ่าย (ทั้งหมด)</h3>
               <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                   <div
                       className="h-full bg-green-500 transition-all duration-700 ease-out"
                       style={{ width: `${incomePercent}%` }}
                   ></div>
                   <div
                       className="h-full bg-red-500 transition-all duration-700 ease-out"
                       style={{ width: `${expensePercent}%` }}
                   ></div>
               </div>
               <div className="flex justify-between text-sm mt-2">
                   <span className="flex items-center text-green-600 font-medium">
                       <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> รายรับ {formatCurrency(totalIncome)}
                   </span>
                   <span className="flex items-center text-red-600 font-medium">
                       <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span> รายจ่าย {formatCurrency(totalExpense)}
                   </span>
               </div>
           </div>
       );
   }, []);

   // ----------------------------------------------------
   // --- Dashboard View ---
   // ----------------------------------------------------
   const Dashboard = () => (
       <div className="space-y-6">
           <h2 className="text-3xl font-extrabold text-indigo-800">ภาพรวมการเงิน</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <SummaryCard
                   title="ยอดคงเหลือสุทธิ"
                   amount={netBalance}
                   icon={Wallet}
                   color={netBalance >= 0 ? 'bg-indigo-500 text-white' : 'bg-red-200 text-red-800'}
                   isNegative={netBalance < 0}
               />
               <SummaryCard title="รวมรายรับ" amount={totalIncome} icon={ArrowUp} color="bg-green-100 text-green-800" />
               <SummaryCard title="รวมรายจ่าย" amount={totalExpense} icon={ArrowDown} color="bg-red-100 text-red-800" />
           </div>

           <ExpenseChart totalIncome={totalIncome} totalExpense={totalExpense} />
           
           {/* --- NEW: Monthly Summary Section --- */}
           <div className="bg-white p-5 rounded-2xl shadow-lg space-y-4">
               <h3 className="text-xl font-semibold text-indigo-800">สรุปภาพรวมรายเดือน</h3>
               <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                   {monthlySummary.length === 0 ? (
                        <p className="text-gray-500 text-center py-2">ยังไม่มีข้อมูลธุรกรรมรายเดือน</p>
                   ) : (
                       monthlySummary.map((m) => (
                           <div key={m.monthKey} className="border-b border-gray-100 pb-3 last:border-b-0">
                               <h4 className="font-bold text-lg text-gray-800">
                                   {getThaiMonthName(m.month)} {m.year}
                               </h4>
                               <div className="flex justify-between text-sm mt-1">
                                   <p className="text-green-600">รายรับ: {formatCurrency(m.income)}</p>
                                   <p className="text-red-600">รายจ่าย: {formatCurrency(m.expense)}</p>
                               </div>
                               <p className={`font-bold text-base mt-1 ${m.net >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                                   คงเหลือ: {formatCurrency(m.net)}
                               </p>
                           </div>
                       ))
                   )}
               </div>
           </div>
           {/* --- END NEW SECTION --- */}

           <div className="bg-white p-5 rounded-2xl shadow-lg space-y-4">
               <h3 className="text-xl font-semibold text-indigo-800">ภาพรวมเป้าหมาย</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="border border-gray-200 p-4 rounded-xl">
                       <p className="font-semibold text-lg text-gray-700 flex items-center"><PiggyBank className="w-5 h-5 mr-2 text-pink-500"/> เป้าหมายการออม</p>
                       <p className="text-3xl font-bold text-pink-600 mt-1">{savingsGoals.length} รายการ</p>
                       {savingsGoals.slice(0, 1).map(goal => {
                           const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                           return (
                               <div key={goal.id} className="mt-3 text-sm">
                                   <p className="font-medium">{goal.goalName} ({formatCurrency(goal.targetAmount)})</p>
                                   <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                       <div className="bg-pink-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                   </div>
                                   <p className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}% บรรลุ</p>
                               </div>
                           );
                       })}
                       {savingsGoals.length === 0 && <p className="text-sm text-gray-500 mt-2">ยังไม่มีการตั้งเป้าหมาย</p>}
                   </div>

                   <div className="border border-gray-200 p-4 rounded-xl">
                       <p className="font-semibold text-lg text-gray-700 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-teal-500"/> ผลตอบแทนการลงทุน</p>
                       <p className="text-3xl font-bold mt-1" style={{ color: investmentData.actualReturnAmount >= 0 ? '#047857' : '#dc2626' }}>
                           {formatCurrency(investmentData.actualReturnAmount)}
                       </p>
                       <p className="text-sm text-gray-500 mt-2">
                           เป้าหมาย: <span className="font-medium text-gray-700">{formatPercent(investmentData.expectedReturnRate)}</span>
                       </p>
                       <p className="text-xs text-gray-500">
                           เงินต้น: {formatCurrency(investmentData.principal)}
                       </p>
                   </div>
               </div>
           </div>
       </div>
   );

   // ----------------------------------------------------
   // --- Transactions View ---
   // ----------------------------------------------------
   const Transactions = () => {
       const [isIncomeMode, setIsIncomeMode] = useState(true);
       const [amount, setAmount] = useState('');
       const [category, setCategory] = useState(isIncomeMode ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
       const [description, setDescription] = useState('');

       useEffect(() => {
           // Reset category when switching mode
           setCategory(isIncomeMode ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
       }, [isIncomeMode]);

       const handleSubmit = (e) => {
           e.preventDefault();
           if (!amount || Number(amount) <= 0 || !category) {
               return showMessage('กรุณากรอกจำนวนเงินและเลือกหมวดหมู่');
           }
           const type = isIncomeMode ? 'income' : 'expense';
           addTransaction(type, { amount, category, description: description || (isIncomeMode ? 'ไม่ระบุ' : 'ไม่ระบุ') });
           setAmount('');
           setDescription('');
       };

       const currentCategories = isIncomeMode ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

       return (
           <div className="space-y-6">
               <h2 className="text-3xl font-extrabold text-indigo-800">บันทึกรายรับ-รายจ่าย</h2>

               {/* Toggle Button */}
               <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                   <button
                       onClick={() => setIsIncomeMode(true)}
                       className={`flex-1 p-3 rounded-xl font-bold transition-all duration-300 ${isIncomeMode ? 'bg-green-500 text-white shadow-lg' : 'text-gray-600'}`}
                   >
                       + รายรับ (Income)
                   </button>
                   <button
                       onClick={() => setIsIncomeMode(false)}
                       className={`flex-1 p-3 rounded-xl font-bold transition-all duration-300 ${!isIncomeMode ? 'bg-red-500 text-white shadow-lg' : 'text-gray-600'}`}
                   >
                       - รายจ่าย (Expense)
                   </button>
               </div>

               {/* Transaction Form */}
               <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-xl space-y-4 border-t-4 border-indigo-500">
                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                       <input
                           type="number"
                           value={amount}
                           onChange={(e) => setAmount(e.target.value)}
                           placeholder="0.00"
                           className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                           min="1"
                           required
                       />
                   </div>
                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                       <select
                           value={category}
                           onChange={(e) => setCategory(e.target.value)}
                           className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                           required
                       >
                           {currentCategories.map(cat => (
                               <option key={cat} value={cat}>{cat}</option>
                           ))}
                       </select>
                   </div>
                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย/บันทึก</label>
                       <input
                           type="text"
                           value={description}
                           onChange={(e) => setDescription(e.target.value)}
                           placeholder="เช่น ซื้อกาแฟ, เงินเดือนเดือนนี้"
                           className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                       />
                   </div>
                   <button
                       type="submit"
                       className={`w-full py-3 rounded-xl font-bold text-white transition-colors duration-300 shadow-md ${isIncomeMode ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                   >
                       บันทึกรายการ
                   </button>
               </form>

               {/* Transaction History */}
               <div className="bg-white p-5 rounded-2xl shadow-lg">
                   <h3 className="text-xl font-semibold mb-3 text-gray-800">ประวัติ 10 รายการล่าสุด</h3>
                   <div className="divide-y divide-gray-100">
                       {transactions.slice(0, 10).map(t => (
                           <div key={t.id} className="flex justify-between items-center py-3">
                               <div className="flex items-center space-x-3">
                                   {t.type === 'income' ?
                                       <ArrowUp className="w-5 h-5 text-green-500 flex-shrink-0" /> :
                                       <ArrowDown className="w-5 h-5 text-red-500 flex-shrink-0" />
                                   }
                                   <div>
                                       <p className="font-medium text-gray-800">{t.category}</p>
                                       <p className="text-xs text-gray-500 truncate max-w-[150px]">{t.description}</p>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <p className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                       {formatCurrency(t.amount)}
                                   </p>
                                   <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString('th-TH')}</p>
                               </div>
                           </div>
                       ))}
                       {transactions.length === 0 && <p className="text-center py-4 text-gray-500">ยังไม่มีการบันทึกรายการ</p>}
                   </div>
               </div>
           </div>
       );
   };

   // ----------------------------------------------------
   // --- Goals View ---
   // ----------------------------------------------------
   const Goals = () => {
       const [activeGoalTab, setActiveGoalTab] = useState('savings'); // 'savings' or 'investment'

       // --- Savings Form State ---
       const [goalName, setGoalName] = useState('');
       const [targetAmount, setTargetAmount] = useState('');
       const [currentAmount, setCurrentAmount] = useState('');

       const handleSavingsSubmit = (e) => {
           e.preventDefault();
           if (!goalName || !targetAmount || Number(targetAmount) <= 0) {
               return showMessage('กรุณากรอกชื่อและเป้าหมายเงินออม');
           }
           addOrUpdateSavingsGoal({ goalName: goalName, targetAmount: targetAmount, currentAmount: currentAmount });
           setGoalName('');
           setTargetAmount('');
           setCurrentAmount('');
       };

       // --- Investment Form State ---
       const [iPrincipal, setIPrincipal] = useState(investmentData.principal);
       const [iExpectedRate, setIExpectedRate] = useState(investmentData.expectedReturnRate * 100);
       const [iActualAmount, setIActualAmount] = useState(investmentData.actualReturnAmount);

       useEffect(() => {
            // Sync internal state when firestore data changes
            setIPrincipal(investmentData.principal);
            setIExpectedRate(investmentData.expectedReturnRate * 100);
            setIActualAmount(investmentData.actualReturnAmount);
       }, [investmentData]);

       const handleInvestmentSubmit = (e) => {
           e.preventDefault();
           updateInvestmentData({
               principal: Number(iPrincipal),
               expectedReturnRate: Number(iExpectedRate) / 100,
               actualReturnAmount: Number(iActualAmount),
           });
       };

       const renderSavingsGoals = () => (
           <>
               <div className="bg-white p-5 rounded-2xl shadow-xl space-y-4 border-t-4 border-pink-500">
                   <h3 className="text-xl font-bold text-pink-600 flex items-center"><PiggyBank className="w-6 h-6 mr-2"/> ตั้งเป้าเงินออมใหม่</h3>
                   <form onSubmit={handleSavingsSubmit} className="space-y-3">
                       <input type="text" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="ชื่อเป้าหมาย (เช่น เงินดาวน์รถ)" className="w-full p-2 border border-gray-300 rounded-lg" required />
                       <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="เป้าเงินออม (บาท)" className="w-full p-2 border border-gray-300 rounded-lg" min="1" required />
                       <input type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="เงินออมปัจจุบัน (ถ้ามี)" className="w-full p-2 border border-gray-300 rounded-lg" />
                       <button type="submit" className="w-full py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg shadow-md transition-colors">บันทึกเป้าหมาย</button>
                   </form>
               </div>

               <div className="mt-6 space-y-4">
                   <h3 className="text-xl font-bold text-gray-800">รายการเป้าหมายการออม</h3>
                   {savingsGoals.length === 0 ? (
                       <p className="text-gray-500 p-4 bg-white rounded-xl shadow-md text-center">ยังไม่มีเป้าหมายการออม</p>
                   ) : (
                       savingsGoals.map(goal => {
                           const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                           return (
                               <div key={goal.id} className="bg-white p-4 rounded-xl shadow-md border-l-4 border-pink-500">
                                   <h4 className="font-bold text-lg text-gray-800">{goal.goalName}</h4>
                                   <p className="text-sm text-gray-600">เป้าหมาย: {formatCurrency(goal.targetAmount)}</p>
                                   <p className="text-sm text-gray-600">ออมแล้ว: {formatCurrency(goal.currentAmount)}</p>
                                   <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                       <div className="bg-pink-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${progress}%` }}></div>
                                   </div>
                                   <p className="text-xs font-medium text-pink-600 mt-1">{progress.toFixed(1)}% ({formatCurrency(goal.targetAmount - goal.currentAmount)} เหลือ)</p>
                               </div>
                           );
                       })
                   )}
               </div>
           </>
       );

       const renderInvestmentGoals = () => (
           <>
               <div className="bg-white p-5 rounded-2xl shadow-xl space-y-4 border-t-4 border-teal-500">
                   <h3 className="text-xl font-bold text-teal-600 flex items-center"><TrendingUp className="w-6 h-6 mr-2"/> ตั้งเป้า/อัปเดตการลงทุน</h3>
                   <form onSubmit={handleInvestmentSubmit} className="space-y-3">
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">เงินต้นที่ลงทุน (บาท)</label>
                           <input type="number" value={iPrincipal} onChange={(e) => setIPrincipal(e.target.value)} placeholder="0" className="w-full p-2 border border-gray-300 rounded-lg" required min="0" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">เป้าหมายผลตอบแทน (ต่อปี, %)</label>
                           <input type="number" value={iExpectedRate} onChange={(e) => setIExpectedRate(e.target.value)} placeholder="10.0" className="w-full p-2 border border-gray-300 rounded-lg" required step="0.1" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">ผลตอบแทนจริงที่ได้รับ/ปัจจุบัน (บาท)</label>
                           <input type="number" value={iActualAmount} onChange={(e) => setIActualAmount(e.target.value)} placeholder="0.00" className="w-full p-2 border border-gray-300 rounded-lg" required />
                       </div>
                       <button type="submit" className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg shadow-md transition-colors">อัปเดตข้อมูล</button>
                   </form>
               </div>

               <div className="mt-6 bg-white p-5 rounded-2xl shadow-lg border-l-4 border-teal-500">
                   <h3 className="text-xl font-bold text-gray-800">สรุปผลการลงทุน</h3>
                   <p className="mt-3 text-lg font-semibold text-gray-700">เงินต้นทั้งหมด: <span className="text-indigo-600">{formatCurrency(investmentData.principal)}</span></p>
                   <p className="mt-1 text-lg font-semibold text-gray-700">เป้าหมายผลตอบแทน: <span className="text-teal-600">{formatPercent(investmentData.expectedReturnRate)}</span></p>
                   <p className="mt-1 text-lg font-semibold text-gray-700">ผลตอบแทนจริง: <span style={{ color: investmentData.actualReturnAmount >= 0 ? '#047857' : '#dc2626' }}>{formatCurrency(investmentData.actualReturnAmount)}</span></p>
                   <p className="text-xs text-gray-500 mt-2">อัปเดตล่าสุด: {investmentData.lastUpdate}</p>
               </div>
           </>
       );

       return (
           <div className="space-y-6">
               <h2 className="text-3xl font-extrabold text-indigo-800">เป้าหมาย & การลงทุน</h2>

               <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                   <button
                       onClick={() => setActiveGoalTab('savings')}
                       className={`flex-1 p-3 rounded-xl font-bold transition-all duration-300 ${activeGoalTab === 'savings' ? 'bg-pink-500 text-white shadow-lg' : 'text-gray-600'}`}
                   >
                       เงินออม (Savings)
                   </button>
                   <button
                       onClick={() => setActiveGoalTab('investment')}
                       className={`flex-1 p-3 rounded-xl font-bold transition-all duration-300 ${activeGoalTab === 'investment' ? 'bg-teal-500 text-white shadow-lg' : 'text-gray-600'}`}
                   >
                       การลงทุน (Investment)
                   </button>
               </div>

               {activeGoalTab === 'savings' ? renderSavingsGoals() : renderInvestmentGoals()}
           </div>
       );
   };


   // ----------------------------------------------------
   // --- Main Render ---
   // ----------------------------------------------------

   if (error) {
       return <div className="p-8 text-center text-red-600 font-bold bg-red-100 rounded-lg m-4">{error}</div>;
   }

   const renderContent = () => {
       switch (activeTab) {
           case 'transactions':
               return <Transactions />;
           case 'goals':
               return <Goals />;
           case 'dashboard':
           default:
               return <Dashboard />;
       }
   };

   return (
       <div className="min-h-screen bg-gray-50 font-sans antialiased pb-20">
           {isLoading && <LoadingOverlay />}
           <Modal message={modalMessage} />
           <div className="p-4 sm:p-6 max-w-lg mx-auto">
               <header className="py-4 mb-6">
                   <h1 className="text-4xl font-black text-indigo-700">My<span className="text-pink-500">Fin</span></h1>
                   <p className="text-gray-500 mt-1">บันทึกการเงินง่าย ๆ สำหรับทุกคน</p>
                   {userId && <p className="text-xs text-gray-400 mt-2 break-all">User ID: {userId}</p>}
               </header>

               <main>
                   {renderContent()}
               </main>
           </div>

           {/* Bottom Navigation (Mobile-Friendly) */}
           <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
               <nav className="flex justify-around max-w-lg mx-auto">
                   <NavItem icon={Home} label="ภาพรวม" tab="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} />
                   <NavItem icon={DollarSign} label="ธุรกรรม" tab="transactions" activeTab={activeTab} setActiveTab={setActiveTab} />
                   <NavItem icon={BarChart3} label="เป้าหมาย" tab="goals" activeTab={activeTab} setActiveTab={setActiveTab} />
               </nav>
           </div>
       </div>
   );
};

// --- Nav Item Component ---
const NavItem = ({ icon: Icon, label, tab, activeTab, setActiveTab }) => {
   const isActive = activeTab === tab;
   return (
       <button
           onClick={() => setActiveTab(tab)}
           className={`flex flex-col items-center p-3 sm:p-4 transition-colors duration-200 ${isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-400'}`}
       >
           <Icon className="w-6 h-6"/>
           <span className="text-xs mt-1 font-medium">{label}</span>
       </button>
   );
};

export default App;