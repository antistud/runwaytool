import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const LOCAL_STORAGE_KEY = 'startup-cash-management-data';

const StartupCashManagement = () => {
  // Load data from localStorage or use defaults
  const loadFromLocalStorage = () => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
    
    // Default values if nothing in localStorage
    return {
      weeks: 16,
      startingCash: 100000,
      weeklyRevenue: 5000,
      weeklyPayroll: 8000,
      weeklyOpex: 3000,
      revenueGrowth: 5,
      memo: {
        cashPosition: 100000,
        yearlyPlan: "Achieve product-market fit and prepare for Series A",
        financingPlans: "Raise $1.5M seed round in Q3",
        assumptions: "20% monthly revenue growth, 15% increase in team size by EOY"
      },
      events: []
    };
  };

  const savedData = loadFromLocalStorage();
  
  // Initial state with data from localStorage or defaults
  const [weeks, setWeeks] = useState(savedData.weeks);
  const [startingCash, setStartingCash] = useState(savedData.startingCash);
  const [weeklyRevenue, setWeeklyRevenue] = useState(savedData.weeklyRevenue);
  const [weeklyPayroll, setWeeklyPayroll] = useState(savedData.weeklyPayroll);
  const [weeklyOpex, setWeeklyOpex] = useState(savedData.weeklyOpex);
  const [revenueGrowth, setRevenueGrowth] = useState(savedData.revenueGrowth);
  const [showMemo, setShowMemo] = useState(false);
  const [memo, setMemo] = useState(savedData.memo);
  
  // Event planning state
  const [events, setEvents] = useState(savedData.events);
  const [newEvent, setNewEvent] = useState({
    name: "",
    week: 1,
    type: "cash",
    amount: 0,
    recurring: false
  });
  const [showEventForm, setShowEventForm] = useState(false);
  
  // Calculate cash flow data
  const calculateCashFlow = () => {
    let data = [];
    let currentCash = startingCash;
    let currentRevenue = weeklyRevenue;
    let currentPayroll = weeklyPayroll;
    let currentOpex = weeklyOpex;
    let baseRevenue = weeklyRevenue; // Local variable to track base revenue
    
    for (let i = 0; i < weeks; i++) {
      const weekNum = i + 1;
      
      // Apply growth rate to revenue (compounded weekly)
      if (i > 0) {
        // Calculate the growth factor based on the number of weeks
        const growthFactor = Math.pow((1 + (revenueGrowth / 100)), i);
        
        // Apply growth rate to the base revenue
        // This ensures that both initial revenue and any recurring revenue changes grow
        currentRevenue = baseRevenue * growthFactor;
        
        // Log for debugging
        // console.log(`Week ${weekNum}: Base Revenue: ${baseRevenue}, Growth Factor: ${growthFactor}, Current Revenue: ${currentRevenue}`);
      }
      
      // Process events for this week
      const weekEvents = events.filter(event => {
        if (event.recurring) {
          return event.week <= weekNum;
        } else {
          return event.week === weekNum;
        }
      });
      
      let eventCashImpact = 0;
      let eventRevenueImpact = 0;
      let eventPayrollImpact = 0;
      let eventOpexImpact = 0;
      let weeklyEvents = [];
      
      weekEvents.forEach(event => {
        // Add to weekly events for display
        weeklyEvents.push(event.name);
        
        // Apply impact based on event type
        switch(event.type) {
          case 'cash':
            // One-time cash infusion (like fundraising)
            eventCashImpact += event.recurring ? 0 : parseInt(event.amount);
            break;
          case 'revenue':
            // Change to recurring revenue
            eventRevenueImpact += parseInt(event.amount);
            break;
          case 'payroll':
            // Change to recurring payroll costs
            eventPayrollImpact += parseInt(event.amount);
            break;
          case 'opex':
            // Change to recurring operating expenses
            eventOpexImpact += parseInt(event.amount);
            break;
          default:
            break;
        }
      });
      
      // Apply event impacts to weekly values
      // For one-time revenue events, add them directly
      // For recurring revenue events, they should be included in the base and grow with the rate
      const oneTimeRevenueImpact = weekEvents
        .filter(e => {
          const event = events.find(ev => ev.name === e);
          return event && !event.recurring && event.type === 'revenue';
        })
        .reduce((sum, e) => {
          const event = events.find(ev => ev.name === e);
          return sum + parseInt(event.amount);
        }, 0);
        
      // Get recurring revenue events that started in previous weeks
      // These should already be factored into the growth calculation
      const recurringRevenueEvents = weekEvents
        .filter(e => {
          const event = events.find(ev => ev.name === e);
          return event && event.recurring && event.type === 'revenue' && event.week < weekNum;
        });
        
      const adjustedRevenue = Math.round(currentRevenue + oneTimeRevenueImpact);
      const adjustedPayroll = currentPayroll + eventPayrollImpact;
      const adjustedOpex = currentOpex + eventOpexImpact;
      
      const week = {
        weekNum: weekNum,
        week: `Week ${weekNum}`,
        startingCash: currentCash,
        revenue: adjustedRevenue,
        payroll: adjustedPayroll,
        opex: adjustedOpex,
        endingCash: Math.round(currentCash + adjustedRevenue - adjustedPayroll - adjustedOpex + eventCashImpact),
        events: weeklyEvents
      };
      
      data.push(week);
      currentCash = week.endingCash;
      
      // Update recurring values if there were impacts
      if (eventRevenueImpact !== 0 && !weekEvents.some(e => events.find(ev => ev.name === e)?.recurring === false)) {
        // Update current revenue with the adjusted value
        currentRevenue = adjustedRevenue;
      }
      
      // For revenue, payroll and opex, we need to be careful not to double-count recurring events
      // Only apply the impact of new events that start this week
      const newRevenueEvents = weekEvents.filter(e => {
        const event = events.find(ev => ev.name === e);
        return event && event.recurring && event.type === 'revenue' && event.week === weekNum;
      });
      
      const newPayrollEvents = weekEvents.filter(e => {
        const event = events.find(ev => ev.name === e);
        return event && event.recurring && event.type === 'payroll' && event.week === weekNum;
      });
      
      const newOpexEvents = weekEvents.filter(e => {
        const event = events.find(ev => ev.name === e);
        return event && event.recurring && event.type === 'opex' && event.week === weekNum;
      });
      
      // Calculate impact of only new recurring events
      let newPayrollImpact = 0;
      let newOpexImpact = 0;
      
      newPayrollEvents.forEach(e => {
        const event = events.find(ev => ev.name === e);
        newPayrollImpact += parseInt(event.amount);
      });
      
      newOpexEvents.forEach(e => {
        const event = events.find(ev => ev.name === e);
        newOpexImpact += parseInt(event.amount);
      });
      
      // Calculate impact of only new recurring revenue events
      let newRevenueImpact = 0;
      
      newRevenueEvents.forEach(e => {
        const event = events.find(ev => ev.name === e);
        newRevenueImpact += parseInt(event.amount);
      });
      
      // Update base values with only the new impacts
      if (newRevenueImpact !== 0) {
        // For recurring revenue events, add to the base revenue
        // This will ensure they grow with the growth rate in future weeks
        baseRevenue += newRevenueImpact;
        
        // Also add to current revenue for this week's calculation
        // since the growth calculation won't apply until next week
        currentRevenue += newRevenueImpact;
      }
      
      if (newPayrollImpact !== 0) {
        currentPayroll += newPayrollImpact;
      }
      
      if (newOpexImpact !== 0) {
        currentOpex += newOpexImpact;
      }
    }
    
    return data;
  };
  
  const cashFlowData = calculateCashFlow();
  
  // Calculate runway in weeks
  const calculateRunway = () => {
    if (cashFlowData.length === 0) return 0;
    
    let runway = 0;
    for (let i = 0; i < cashFlowData.length; i++) {
      if (cashFlowData[i].endingCash > 0) {
        runway = i + 1;
      } else {
        break;
      }
    }
    
    // If we never ran out of cash, return the total number of weeks
    if (runway === cashFlowData.length) {
      return `${runway}+ weeks`;
    }
    
    return `${runway} weeks`;
  };
  
  // Extract chart data
  const chartData = cashFlowData.map(week => ({
    name: week.week,
    cash: week.endingCash,
    revenue: week.revenue,
    spend: week.payroll + week.opex,
    net: week.revenue - week.payroll - week.opex,
  }));
  
  // Check if we're cash flow positive
  const isCashFlowPositive = () => {
    if (cashFlowData.length < 2) return false;
    return cashFlowData[cashFlowData.length - 1].endingCash > cashFlowData[cashFlowData.length - 2].endingCash;
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Save data to localStorage whenever relevant state changes
  useEffect(() => {
    const dataToSave = {
      weeks,
      startingCash,
      weeklyRevenue,
      weeklyPayroll,
      weeklyOpex,
      revenueGrowth,
      memo,
      events
    };
    
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  }, [weeks, startingCash, weeklyRevenue, weeklyPayroll, weeklyOpex, revenueGrowth, memo, events]);

  // Update memo when form changes
  useEffect(() => {
    setMemo({
      ...memo,
      cashPosition: startingCash
    });
  }, [startingCash]);
  
  return (
    <div className="p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-center">Startup Cash Management Dashboard</h1>
        <button 
          onClick={() => {
            if (window.confirm('Are you sure you want to reset all data to defaults?')) {
              localStorage.removeItem(LOCAL_STORAGE_KEY);
              window.location.reload();
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset Data
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Cash Position</h2>
          <div className="text-4xl font-bold text-blue-700">{formatCurrency(startingCash)}</div>
          <p className="text-sm text-gray-600 mt-2">Starting Balance</p>
          
          <div className="mt-4">
            <p className="font-medium">Runway: <span className="text-xl font-bold">{calculateRunway()}</span></p>
            <p className="font-medium mt-2">Cash Flow Status: 
              <span className={`ml-2 px-2 py-1 rounded ${isCashFlowPositive() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isCashFlowPositive() ? 'Positive' : 'Negative'}
              </span>
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Weekly Cash Flow</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(weeklyRevenue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expenses</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(weeklyPayroll + weeklyOpex)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Net</p>
              <p className={`text-xl font-bold ${weeklyRevenue - weeklyPayroll - weeklyOpex >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(weeklyRevenue - weeklyPayroll - weeklyOpex)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Growth</p>
              <p className="text-xl font-bold text-purple-700">{revenueGrowth}%</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Financial Summary</h2>
          <button 
            onClick={() => setShowMemo(!showMemo)} 
            className="mb-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {showMemo ? 'Hide' : 'Show'} Financial Memo
          </button>
          
          {showMemo && (
            <div className="bg-white p-3 rounded shadow-sm">
              <h3 className="font-medium">Current Cash Position</h3>
              <p className="mb-2">{formatCurrency(memo.cashPosition)}</p>
              
              <h3 className="font-medium">Yearly Plan</h3>
              <p className="mb-2">{memo.yearlyPlan}</p>
              
              <h3 className="font-medium">Financing Plans</h3>
              <p className="mb-2">{memo.financingPlans}</p>
              
              <h3 className="font-medium">Key Assumptions</h3>
              <p>{memo.assumptions}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Cash Flow & Revenue Projection</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [formatCurrency(value), name]}
                labelFormatter={(label) => {
                  const weekData = cashFlowData.find(w => w.week === label);
                  if (weekData && weekData.events && weekData.events.length > 0) {
                    return `${label} - Events: ${weekData.events.join(', ')}`;
                  }
                  return label;
                }}
              />
              <Legend />
              {events.map((event, index) => (
                <ReferenceLine
                  key={`event-${index}`}
                  x={`Week ${event.week}`}
                  stroke="#8884d8"
                  strokeDasharray="3 3"
                  label={{ value: event.name, position: 'insideTopRight', fill: '#8884d8', fontSize: 10 }}
                />
              ))}
              <Line 
                type="monotone" 
                dataKey="cash" 
                stroke="#3b82f6" 
                name="Cash Balance" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                name="Weekly Revenue" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="spend" 
                stroke="#ef4444" 
                name="Weekly Spend" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#8b5cf6" 
                name="Weekly Net" 
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="3 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Cash</label>
              <input 
                type="number" 
                min="0"
                value={startingCash} 
                onChange={(e) => setStartingCash(Number(e.target.value))}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Initial cash balance</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Projection Weeks</label>
              <input 
                type="number" 
                min="1"
                max="52"
                value={weeks} 
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Revenue</label>
              <input 
                type="number" 
                min="0"
                value={weeklyRevenue} 
                onChange={(e) => setWeeklyRevenue(Number(e.target.value))}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Revenue Growth (%)</label>
              <input 
                type="number" 
                min="-100"
                max="100"
                step="0.1"
                value={revenueGrowth} 
                onChange={(e) => setRevenueGrowth(Number(e.target.value))}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Compounded weekly growth rate</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Payroll</label>
              <input 
                type="number" 
                min="0"
                value={weeklyPayroll} 
                onChange={(e) => setWeeklyPayroll(Number(e.target.value))}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Operating Expenses</label>
              <input 
                type="number" 
                min="0"
                value={weeklyOpex} 
                onChange={(e) => setWeeklyOpex(Number(e.target.value))}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Financial Events Planning</h2>
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Scheduled Events</h3>
            <button 
              onClick={() => setShowEventForm(!showEventForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              {showEventForm ? 'Cancel' : 'Add New Event'}
            </button>
          </div>
          
          {showEventForm && (
            <div className="bg-gray-50 p-4 rounded mb-4">
              <h4 className="font-medium mb-2">New Financial Event</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <input 
                    type="text" 
                    value={newEvent.name} 
                    onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Seed Round, New Hire, Major Contract"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                  <input 
                    type="number" 
                    min="1"
                    max={weeks}
                    value={newEvent.week} 
                    onChange={(e) => setNewEvent({...newEvent, week: Number(e.target.value)})}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select 
                    value={newEvent.type} 
                    onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash Infusion (e.g., Funding)</option>
                    <option value="revenue">Revenue Change</option>
                    <option value="payroll">Payroll Change</option>
                    <option value="opex">Operating Expenses Change</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input 
                    type="number" 
                    value={newEvent.amount} 
                    onChange={(e) => setNewEvent({...newEvent, amount: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder={newEvent.type === 'cash' ? "e.g., 500000 for funding" : "Weekly amount change"}
                  />
                </div>
                <div className="col-span-2 flex items-center">
                  <input 
                    type="checkbox" 
                    id="recurring" 
                    checked={newEvent.recurring} 
                    onChange={(e) => setNewEvent({...newEvent, recurring: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
                    {newEvent.type === 'cash' 
                      ? "This cash impact occurs weekly (not recommended for fundraising)" 
                      : "This is a permanent change (e.g., new employee, permanent revenue increase)"}
                  </label>
                </div>
                <div className="col-span-2">
                  <button 
                    onClick={() => {
                      if (newEvent.name && newEvent.amount) {
                        setEvents([...events, {...newEvent}]);
                        setNewEvent({
                          name: "",
                          week: 1,
                          type: "cash",
                          amount: 0,
                          recurring: false
                        });
                        setShowEventForm(false);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
                    disabled={!newEvent.name || !newEvent.amount}
                  >
                    Add Event
                  </button>
                  <button 
                    onClick={() => setShowEventForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 whitespace-nowrap">{event.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">Week {event.week}</td>
                      <td className="px-4 py-2 whitespace-nowrap capitalize">{event.type}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(event.amount)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {event.recurring ? 'Permanent' : 'One-time'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button 
                          onClick={() => setEvents(events.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No events scheduled. Add a financial event to model future changes in your cash flow.</p>
          )}
          
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Financial Memo Editor</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Plan</label>
            <textarea 
              value={memo.yearlyPlan} 
              onChange={(e) => setMemo({...memo, yearlyPlan: e.target.value})}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              rows="2"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Financing Plans</label>
            <textarea 
              value={memo.financingPlans} 
              onChange={(e) => setMemo({...memo, financingPlans: e.target.value})}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              rows="2"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Assumptions</label>
            <textarea 
              value={memo.assumptions} 
              onChange={(e) => setMemo({...memo, assumptions: e.target.value})}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              rows="2"
            ></textarea>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Weekly Cash Flow Detail</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Starting Cash</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payroll</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operating Expenses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ending Cash</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cashFlowData.map((week, idx) => (
              <tr key={idx} className={week.endingCash < 0 ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">{week.week}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(week.startingCash)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(week.revenue)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(week.payroll)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(week.opex)}</td>
                <td className={`px-6 py-4 whitespace-nowrap font-medium ${week.endingCash < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(week.endingCash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h2 className="text-xl font-semibold">Cash Management Checklist</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                const dataToSave = {
                  weeks,
                  startingCash,
                  weeklyRevenue,
                  weeklyPayroll,
                  weeklyOpex,
                  revenueGrowth,
                  memo,
                  events
                };
                
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
                  alert('Data saved successfully!');
                } catch (error) {
                  console.error('Error saving data:', error);
                  alert('Error saving data. Please try again.');
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save Data
            </button>
            
            <button 
              onClick={() => {
                const dataToExport = {
                  weeks,
                  startingCash,
                  weeklyRevenue,
                  weeklyPayroll,
                  weeklyOpex,
                  revenueGrowth,
                  memo,
                  events
                };
                
                const dataStr = JSON.stringify(dataToExport, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = 'startup-cash-management-data.json';
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Export Data
            </button>
            
            <label className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 cursor-pointer">
              Import Data
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const fileReader = new FileReader();
                  fileReader.readAsText(e.target.files[0], "UTF-8");
                  fileReader.onload = e => {
                    try {
                      const importedData = JSON.parse(e.target.result);
                      
                      // Update all state with imported data
                      setWeeks(importedData.weeks || 16);
                      setStartingCash(importedData.startingCash || 100000);
                      setWeeklyRevenue(importedData.weeklyRevenue || 5000);
                      setWeeklyPayroll(importedData.weeklyPayroll || 8000);
                      setWeeklyOpex(importedData.weeklyOpex || 3000);
                      setRevenueGrowth(importedData.revenueGrowth || 5);
                      setMemo(importedData.memo || {
                        cashPosition: importedData.startingCash || 100000,
                        yearlyPlan: "Achieve product-market fit and prepare for Series A",
                        financingPlans: "Raise $1.5M seed round in Q3",
                        assumptions: "20% monthly revenue growth, 15% increase in team size by EOY"
                      });
                      setEvents(importedData.events || []);
                      
                      alert('Data imported successfully!');
                    } catch (error) {
                      console.error('Error importing data:', error);
                      alert('Error importing data. Please check the file format.');
                    }
                  };
                }}
              />
            </label>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <label>Do you have a founder memo that communicates the past performance, current state, and vision for the company's cash and financing?</label>
          </div>
          <div className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <label>Are you set up for weekly cash management and finance meetings?</label>
          </div>
          <div className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <label>Do you have a cash management and finance spreadsheet broken out by week for the next 15-18 months?</label>
          </div>
          <div className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <label>Do you have a plan for shared communication on cash management and finances for critical stakeholders?</label>
          </div>
          <div className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <label>Do you have the necessary service providers to help you execute this plan?</label>
          </div>
          <div className="flex items-start">
            <input type="checkbox" className="mt-1 mr-2" />
            <label>Are you checking regularly to see if you are on or off track and adjusting accordingly?</label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartupCashManagement;
