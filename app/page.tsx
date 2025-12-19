'use client'
import { useState, useEffect } from 'react'

interface DayRecord {
  date: string
  meals: MealData
  totalCalories: number
}

interface UserProfile {
  name: string
  height: number
  weight: number
  age: number
  gender: 'male' | 'female'
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'heavy' | 'very_intense'
  goal: 'surplus' | 'deficit'
  goalAmount: number
}

interface FoodItem {
  id: string
  name: string
  calories: number
}

interface MealData {
  [key: string]: FoodItem[]
}

const mealEmojis: { [key: string]: string } = {
  breakfast: '🌅',
  lunch: '🍽️',
  dinner: '🌙',
  snacks: '🍿',
}
const PROFILE_KEY = 'calorieTrackerProfile'

const activityMultipliers: { [key: string]: number } = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  very_intense: 1.9,
}

const mealColors: { [key: string]: { bg: string; text: string; light: string } } = {
  breakfast: { bg: 'from-orange-500 to-yellow-500', text: 'text-orange-600', light: 'bg-orange-50' },
  lunch: { bg: 'from-green-500 to-emerald-500', text: 'text-green-600', light: 'bg-green-50' },
  dinner: { bg: 'from-purple-500 to-indigo-500', text: 'text-purple-600', light: 'bg-purple-50' },
  snacks: { bg: 'from-pink-500 to-rose-500', text: 'text-pink-600', light: 'bg-pink-50' },
}

const STORAGE_KEY = 'calorieTrackerData'
const HISTORY_KEY = 'calorieTrackerHistory'

const fetchCalories = async (foodName: string): Promise<number | null> => {
  try {
    const response = await fetch(
      `/api/calories?food=${encodeURIComponent(foodName)}`
    )

    if (!response.ok) return null

    const data = await response.json()
    return data.calories ?? null
  } catch {
    return null
  }
}

export default function Dashboard() {
  const [meals, setMeals] = useState<MealData>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  })

  const NAME_KEY = 'calorieTrackerUserName'

  const [userName, setUserName] = useState('')
  const [tempName, setTempName] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)


  const [inputs, setInputs] = useState({
    breakfast: { name: '', calories: '' },
    lunch: { name: '', calories: '' },
    dinner: { name: '', calories: '' },
    snacks: { name: '', calories: '' },
  })

  const [isLoaded, setIsLoaded] = useState(false)
  const [dailyLimit, setDailyLimit] = useState(1500)
  const [history, setHistory] = useState<DayRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    height: 170,
    weight: 70,
    age: 25,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'deficit',
    goalAmount: 400,
  })

  // Load data from localStorage on mount
  useEffect(() => {

    const savedName = localStorage.getItem(NAME_KEY)
    if (savedName) {
      setUserName(savedName)
    }

    const savedProfile = localStorage.getItem(PROFILE_KEY)
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile)
        setProfile(parsedProfile)
        calculateAndSetDailyLimit(parsedProfile)
      } catch (error) {
        console.error('Failed to load profile:', error)
      }
    } else {
      calculateAndSetDailyLimit(profile)
    }

    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setMeals(parsedData)
      } catch (error) {
        console.error('Failed to load saved data:', error)
      }
    }

    const savedHistory = localStorage.getItem(HISTORY_KEY)
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        setHistory(parsedHistory)
      } catch (error) {
        console.error('Failed to load history:', error)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save data to localStorage whenever meals change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meals))
    }
  }, [meals, isLoaded])

    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
    type MealType = typeof mealTypes[number]

  const addFoodItem = (mealType: MealType) => {
    const input = inputs[mealType as keyof typeof inputs]
    if (input.name.trim() && input.calories.trim()) {
      const newItem: FoodItem = {
        id: Date.now().toString(),
        name: input.name,
        calories: parseInt(input.calories),
      }

      setMeals((prev) => ({
        ...prev,
        [mealType]: [...prev[mealType], newItem],
      }))

      setInputs((prev) => ({
        ...prev,
        [mealType]: { name: '', calories: '' },
      }))
    }
  }

  const removeFoodItem = (mealType: string, itemId: string) => {
    setMeals((prev) => ({
      ...prev,
      [mealType]: prev[mealType].filter((item) => item.id !== itemId),
    }))
  }

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data?')) {
      setMeals({
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      })
      localStorage.removeItem(STORAGE_KEY)
    }
  }

const endDay = () => {
  if (!profile.name.trim()) {
    setTempName('')
    setShowNameModal(true)
    return
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const dayRecord: DayRecord = {
    date: today,
    meals: meals,
    totalCalories: getTotalCalories(),
  }

  setHistory(prev => {
    const updated = [...prev, dayRecord]
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    return updated
  })

  setShowHistory(true)

  const dataToDownload = {
    userName: profile.name,
    dailyLimit,
    history: [...history, dayRecord],
    exportDate: new Date().toISOString(),
  }

  // const jsonString = JSON.stringify(dataToDownload, null, 2)
  // const blob = new Blob([jsonString], { type: 'application/json' })
  // const url = URL.createObjectURL(blob)
  // const link = document.createElement('a')
  // link.href = url
  // link.download = `calorie-tracker-${new Date().toISOString().split('T')[0]}.json`
  // document.body.appendChild(link)
  // link.click()
  // document.body.removeChild(link)
  // URL.revokeObjectURL(url)
}

  const calculateBMR = (userProfile: UserProfile): number => {
    const { weight, height, age, gender } = userProfile
    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161
    }
  }

  const calculateTDEE = (userProfile: UserProfile): number => {
    const bmr = calculateBMR(userProfile)
    const multiplier = activityMultipliers[userProfile.activityLevel]
    return bmr * multiplier
  }

  const calculateAndSetDailyLimit = (userProfile: UserProfile) => {
    const tdee = calculateTDEE(userProfile)
    let calorieLimit = tdee

    if (userProfile.goal === 'surplus') {
      calorieLimit = tdee + userProfile.goalAmount
    } else if (userProfile.goal === 'deficit') {
      calorieLimit = tdee - userProfile.goalAmount
    }

    setDailyLimit(Math.round(calorieLimit))
  }

  const handleProfileChange = (field: keyof UserProfile, value: any) => {
    const updatedProfile = { ...profile, [field]: value }
    setProfile(updatedProfile)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile))
    calculateAndSetDailyLimit(updatedProfile)
  }

  const downloadHistoryAsJSON = () => {
    const dataToDownload = {
      dailyLimit: dailyLimit,
      history: history,
      exportDate: new Date().toISOString(),
    }

    const jsonString = JSON.stringify(dataToDownload, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `calorie-tracker-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getTotalCalories = () => {
    return Object.values(meals)
      .flat()
      .reduce((sum, item) => sum + item.calories, 0)
  }

  const getMealCalories = (mealType: string) => {
    return meals[mealType].reduce((sum, item) => sum + item.calories, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black">
              🍎 Calorie Tracker
            </h1>
            <p className="text-slate-300 text-lg">Monitor your daily nutrition with style</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              ⚙️ Profile
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              📋 History
            </button>
            <button
              onClick={endDay}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              🏁 Save
            </button>
            <button
              onClick={clearAllData}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Profile Section */}
        {showProfile && (
          <div className="mb-12 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-8 py-6">
              <h2 className="text-3xl font-black text-white">⚙️ Your Profile</h2>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                {/* Height */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Height (cm)</label>
                  <input
                    type="number"
                    value={profile.height}
                    onChange={(e) => handleProfileChange('height', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={profile.weight}
                    onChange={(e) => handleProfileChange('weight', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Age</label>
                  <input
                    type="number"
                    value={profile.age}
                    onChange={(e) => handleProfileChange('age', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Gender</label>
                  <select
                    value={profile.gender}
                    onChange={(e) => handleProfileChange('gender', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {/* Activity Level */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Activity Level</label>
                  <select
                    value={profile.activityLevel}
                    onChange={(e) => handleProfileChange('activityLevel', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="sedentary">Sedentary (1.2)</option>
                    <option value="light">Light Exercise (1.375)</option>
                    <option value="moderate">Moderate Exercise (1.55)</option>
                    <option value="heavy">Heavy Exercise (1.725)</option>
                    <option value="very_intense">Very Intense Training (1.9)</option>
                  </select>
                </div>

                {/* Goal */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Goal</label>
                  <select
                    value={profile.goal}
                    onChange={(e) => handleProfileChange('goal', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="deficit">Deficit (Lose Weight)</option>
                    <option value="surplus">Surplus (Gain Weight)</option>
                  </select>
                </div>

                {/* Goal Amount */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Goal Calories ({profile.goal === 'surplus' ? '+' : '−'})</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleProfileChange('goalAmount', 300)}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        profile.goalAmount === 300
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      300
                    </button>
                    <button
                      onClick={() => handleProfileChange('goalAmount', 400)}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        profile.goalAmount === 400
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      400
                    </button>
                    <button
                      onClick={() => handleProfileChange('goalAmount', 500)}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        profile.goalAmount === 500
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      500
                    </button>
                  </div>
                </div>
              </div>

              {/* Display calculated values */}
              <div className="mt-8 pt-8 border-t-2 border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold">BMR</p>
                  <p className="text-2xl font-black text-blue-600">{Math.round(calculateBMR(profile))}</p>
                  <p className="text-xs text-gray-500 mt-1">Base Metabolic Rate</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold">TDEE</p>
                  <p className="text-2xl font-black text-green-600">{Math.round(calculateTDEE(profile))}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Daily Energy Expenditure</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold">Daily Limit</p>
                  <p className="text-2xl font-black text-purple-600">{dailyLimit}</p>
                  <p className="text-xs text-gray-500 mt-1">{profile.goal === 'surplus' ? 'Surplus' : 'Deficit'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Calories Summary Card */}
        <div className="mb-12 space-y-4">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <p className="text-cyan-100 text-sm font-bold uppercase tracking-widest mb-2">
              Total Calories Today
            </p>
            <div className="flex items-end justify-between mb-6">
              <div className="flex-1">
                <p className="text-4xl sm:text-5xl lg:text-7xl font-black text-white">{getTotalCalories()}</p>
                <p className="text-cyan-100 text-lg mt-2">out of {dailyLimit} calories</p>
              </div>
              <div className="text-6xl opacity-20">🔥</div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="bg-white bg-opacity-20 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-300 via-yellow-300 to-red-300 h-full transition-all duration-300 shadow-lg"
                  style={{ width: `${Math.min((getTotalCalories() / dailyLimit) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-cyan-100 text-sm mt-2">
                {Math.round((getTotalCalories() / dailyLimit) * 100)}% of daily limit
                {getTotalCalories() > dailyLimit && ` (+${getTotalCalories() - dailyLimit} over)`}
                {getTotalCalories() <= dailyLimit && ` (${dailyLimit - getTotalCalories()} remaining)`}
              </p>
            </div>
          </div>
        </div>

        {/* History Section */}
        {showHistory && (
          <div className="mb-12 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6">
              <h2 className="text-3xl font-black text-white">📋 Calorie History</h2>
            </div>
            <div className="p-8">
              {history.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No history yet. End a day to see it here!</p>
              ) : (
                <div className="space-y-3">
                  {history.map((record, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div>
                          <p className="font-bold text-gray-800">{record.date}</p>
                          <p className="text-sm text-gray-600">
                            {Object.values(record.meals)
                              .flat()
                              .length}{' '}
                            items consumed
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{record.totalCalories}</p>
                          <p className="text-sm text-gray-600">
                            {Math.round((record.totalCalories / dailyLimit) * 100)}% of limit
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {mealTypes.map((mealType) => {
            const colors = mealColors[mealType]
            const calories = getMealCalories(mealType)

            return (
              <div
                key={mealType}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Meal Header */}
                <div className={`bg-gradient-to-r ${colors.bg} px-8 py-6`}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-3xl font-black text-white capitalize flex items-center gap-3">
                      <span className="text-4xl">{mealEmojis[mealType]}</span>
                      {mealType}
                    </h2>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black text-white">{calories}</p>
                    <p className="text-white text-opacity-80">kcal</p>
                  </div>
                </div>

                {/* Meal Content */}
                <div className="p-8">
                  {/* Add Food Form */}
                  <div className="mb-8">
                    <p className="text-gray-600 font-semibold text-sm mb-3 uppercase tracking-wide">
                      Add New Item
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Food name (e.g. banana)"
                        value={inputs[mealType].name}
                        onChange={(e) =>
                            setInputs(prev => ({
                            ...prev,
                            [mealType]: {
                                ...prev[mealType],
                                name: e.target.value,
                            },
                            }))
                        }
                        onBlur={async () => {
                            const name = inputs[mealType].name.trim()
                            if (!name || inputs[mealType].calories) return

                            const calories = await fetchCalories(name)
                            if (calories) {
                            setInputs(prev => ({
                                ...prev,
                                [mealType]: {
                                ...prev[mealType],
                                calories: Math.round(calories).toString(),
                                },
                            }))
                            }
                        }}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400 text-black bg-white"
                        />
                      <input
                        type="number"
                        placeholder="Cal"
                        value={inputs[mealType as keyof typeof inputs].calories}
                        onChange={(e) =>
                          setInputs((prev) => ({
                            ...prev,
                            [mealType]: {
                              ...prev[mealType as keyof typeof inputs],
                              calories: e.target.value,
                            },
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addFoodItem(mealType)
                        }}
                        className="w-20 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400 text-black bg-white"
                      />
                      <br/>
                      
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
  Calories auto-filled per 100g (editable)
</p>
                    <button
                      onClick={() => addFoodItem(mealType)}
                      className={`w-full bg-gradient-to-r ${colors.bg} hover:shadow-lg text-white font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95`}
                    >
                      + Add Item
                    </button>
                  </div>

                  {/* Food Items List */}
                  <div className="space-y-2">
                    <p className="text-gray-600 font-semibold text-sm mb-4 uppercase tracking-wide">
                      {meals[mealType].length} {meals[mealType].length === 1 ? 'Item' : 'Items'}
                    </p>
                    {meals[mealType].length === 0 ? (
                      <div className={`${colors.light} rounded-lg p-8 text-center`}>
                        <p className={`${colors.text} font-semibold`}>No items added yet</p>
                        <p className="text-gray-500 text-sm mt-1">Start tracking your meals!</p>
                      </div>
                    ) : (
                      meals[mealType].map((item) => (
                        <div
                          key={item.id}
                          className={`flex justify-between items-center ${colors.light} p-4 rounded-lg hover:shadow-md transition-all duration-200 group`}
                        >
                          <div className="flex-1">
                            <p className="font-bold text-gray-800">{item.name}</p>
                            <p className={`text-sm ${colors.text} font-semibold`}>
                              {item.calories} calories
                            </p>
                          </div>
                          <button
                            onClick={() => removeFoodItem(mealType, item.id)}
                            className="ml-4 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 transform group-hover:scale-110"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
              {/* 🔔 Name Modal */}
              {showNameModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h2 className="text-2xl font-black text-gray-800 mb-2">
                  👋 Enter Your Name
                </h2>
            <p className="text-gray-600 mb-4">
              Please enter your name before ending the day.
            </p>

            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black focus:outline-none focus:border-indigo-500"
            />

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!tempName.trim()) return
                  handleProfileChange('name', tempName)
                  setShowNameModal(false)
                  setTempName('')
                  endDay()
                }}
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}