// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}

// Global Variables
let statusChart, categoryChart;
const statusColors = {
    'Not Started': '#FFA07A',
    'In Progress': '#4facfe',
    'Completed': '#32CD32'
};

// Initialize Dashboard and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Set dark background
    document.body.style.background = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
    
    // Initialize charts
    const statusChartCtx = document.getElementById('status-chart')?.getContext('2d');
    const categoryChartCtx = document.getElementById('category-chart')?.getContext('2d');
    
    fetchGoals();
    updateDashboard();
    
    // Add event listeners for filters
    document.getElementById('status-filter')?.addEventListener('change', updateDashboard);
    document.getElementById('category-filter')?.addEventListener('change', updateDashboard);
});

async function setGoal() {
    const button = event.target;
    const originalText = button.textContent;
    
    try {
        button.innerHTML = '<div class="loading-spinner"></div>';
        button.disabled = true;
        
        const username = document.getElementById('username').value;
        const title = document.getElementById('goalTitle').value;
        const amount = document.getElementById('goalAmount').value;
        const date = document.getElementById('goalDate').value;
        const category = document.getElementById('goalCategory').value;
        const status = document.getElementById('goalStatus').value;
        
        if (!username || !title || !amount || !date) {
            alert('Please fill in all fields');
            return;
        }
        
        const response = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                title,
                amount: parseFloat(amount),
                date: new Date(date),
                category,
                status
            })
        });
        
        if (response.ok) {
            clearInputs();
            await Promise.all([fetchGoals(), updateDashboard()]);
            showNotification('Goal added successfully!');
        }
    } catch (error) {
        console.error('Error saving goal:', error);
        showNotification('Failed to add goal', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function updateDashboard() {
    try {
        const response = await fetch('/api/dashboard/summary');
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        const summary = await response.json();

        // Update summary cards
        document.getElementById('total-goals').textContent = summary.total;
        document.getElementById('completed-goals').textContent = summary.completed;
        document.getElementById('in-progress-goals').textContent = summary.inProgress;
        document.getElementById('avg-completion').textContent = `${summary.avgProgress}%`;

        // Fetch goals for charts
        const goalsResponse = await fetch('/api/goals');
        if (!goalsResponse.ok) {
            throw new Error('Failed to fetch goals data');
        }
        const goals = await goalsResponse.json();

        // Update charts
        renderCharts(goals);
    } catch (error) {
        console.error('Error updating dashboard:', error);
        showNotification('Failed to update dashboard', 'error');
    }
}

function updateSummaryCards(summary) {
    const elements = {
        'total-goals': summary.total,
        'completed-goals': summary.completed,
        'in-progress-goals': summary.inProgress,
        'avg-completion': `${summary.avgProgress}%`
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.classList.add('update-animation');
            setTimeout(() => element.classList.remove('update-animation'), 500);
        }
    });
}

function renderCharts(goals) {
    const statusCounts = goals.reduce((acc, goal) => {
        acc[goal.status] = (acc[goal.status] || 0) + 1;
        return acc;
    }, {});

    const categoryCounts = goals.reduce((acc, goal) => {
        acc[goal.category] = (acc[goal.category] || 0) + 1;
        return acc;
    }, {});

    // Update status chart
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(statusChartCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: Object.keys(statusCounts).map(status => statusColors[status]),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        color: '#4A4A4A'
                    }
                }
            }
        }
    });

    // Update category chart
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(categoryChartCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                label: 'Goals per Category',
                data: Object.values(categoryCounts),
                backgroundColor: '#4facfe',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#4A4A4A'
                    }
                },
                x: {
                    ticks: {
                        color: '#4A4A4A'
                    }
                }
            }
        }
    });
}

// Utility Functions
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function clearInputs() {
    ['username', 'goalTitle', 'goalAmount', 'goalDate', 'goalCategory', 'goalStatus']
        .forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
}

// Auto-refresh dashboard every 30 seconds
setInterval(updateDashboard, 30000);

// Add this CSS to your stylesheet
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        animation: slideIn 0.5s ease-out;
        z-index: 1000;
    }
    
    .notification.success {
        background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
    }
    
    .notification.error {
        background: linear-gradient(45deg, #ff416c 0%, #ff4b2b 100%);
    }
    
    .update-animation {
        animation: pulse 0.5s ease-out;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .fade-out {
        opacity: 0;
        transition: opacity 0.5s ease-out;
    }
`;
document.head.appendChild(style);

// Add mobile touch events
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

let yDown = null;

function handleTouchStart(evt) {
    yDown = evt.touches[0].clientY;
}

function handleTouchMove(evt) {
    if (!yDown) {
        return;
    }

    const yUp = evt.touches[0].clientY;
    const yDiff = yDown - yUp;

    if (yDiff > 0) {
        // Scrolling down
    } else {
        // Scrolling up - implement pull to refresh
        if (Math.abs(yDiff) > 100) {
            location.reload();
        }
    }
    yDown = null;
}

// sum of two integer


// let a = 12;
// console.log(a);


// let a = 12;
// let b = "yuio"
// let c = a+b

// console.log(c,typeof(c));


//if any number is getting added to a string is called concatination


// let the_firstno = 23;
// let the_secondno = 45;

// console.log(`sum of 23 and 45 : ${the_firstno + the_secondno}`)

// let age = Number(prompt("The age"));
// console.log(  age);
// console.log(typeof age);

// when we change any datatype to another is known as " type casting" 

// let a = 30;
// let b = 45;
// let c;
                            // swapping
// c = a;
// a = b;
// b = c;

// console.log(a , b);


//  let a = 30;
//  let b = 45;
                    // swapping meth 2
//  [a,b] = [b,a]
//  console.log(a,b);
 
// let the_firstno = prompt('TYPE THE NO')
// let the_secondno = prompt('TYPE THE NO')

// if  ( the_firstno === Number ) 
// {
//      console.log(the_secondno);
// }
// else  
// {
//       console.log('The input should be in the Number');

// let i = 34

// i = i++ + ++i
// console.log(i);

// let b = true
//     b++              urinary operator (can't be applied in the constants )
// console.log(b);


// console.log(Math.round(19.5));

// console.log(Math.ceil(19.5));

// console.log(Math.floor(19.5));

// console.log(Math.trunc(19.5));

// console.log(Math.pow(19,4));

// console.log(Math.sqrt(19.5));

// console.log(Math.abs(-453));

// console.log(Math.max(45,6,7));

// console.log(Math.min(45,6,7));

// console.log(Math.trunc(Math.random()*6000));

// function rectangle(length , breadth) {

//     console.log(`The parameter of rectangle : ${2*(length+breadth)}`);
//     console.log(`The area of rectangle :${(length*breadth)}`);
// };

// rectangle(34,56)


// let amount = Number(prompt("What is the  final amount? "))

// if (amount > 0 && amount>= 5000 ) {
//     console.log(amount);
    
// }  else if (amount > 5000 && amount<=7000) {

//     console.log(amount - Math.floor((5*amount)/100));
// }

// else if (amount > 7000 && amount <= 9000) {
//     console.log(amount-Math.floor((10*amount)/100));

// }else if (amount > 9000) {
// }

// // console.log(amount - Math.floor((dis*amount)));

// let unit = prompt("Input the unit") /// 700

// let amount

// if (unit > 400) {
//     amount = (unit - 400) * 13
//     unit = 400   
// }
// if ( unit > 200 && unit <= 400) {
//     amount += (unit-200) *8
//     unit = 200
//  }
// if ( unit > 100 && unit <= 200) {
//     amount += (unit -100) * 6
//     unit = 100
//  }

//  amount += unit*4

//  console.log(amount);
 
// ruppee counter ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 

// let amount = 5555
// if ( amount > 500) {
//     console.log(`Notes of 500 ${Math.floor(amount/500)}`);
//     amount  = amount % 500
// }
// if (amount >=200 ) {
//     console.log(`Notes of 200 ${Math.floor(amount/200)}`);
//     amount = amount % 200
// }
// if (amount >=100 ) {
//     console.log(`Notes of 100 ${Math.floor(amount/100)}`);
//     amount = amount % 100
// }
// if (amount >=50 ) {
//     console.log(`Notes of 50 ${Math.floor(amount/50)}`);
//     amount = amount % 50
// }
// if (amount >=20 ) {
//     console.log(`Notes of 20 ${Math.floor(amount/20)}`);
//     amount = amount % 20
// }
// if (amount >= 10 ) {
//     console.log(`Notes of 10 ${Math.floor(amount/ 10 )}`);
//     amount = amount % 10
// }

// ``````````````````````````````````````````````````````````````````````````````````````

// terninary operator ?

// 4 > 34 ? console.log('yes') : console.log("nope");
// console.log(4 > 34 ? console.log('yes'): console.log('nope'))


// let day  = Number((0.1 + 0.2).toPrecision(1));
// console.log(day);

// switch(day) 
// {

//     case 0.3 :console.log('correct');
//     break  

//     case 0.5 :console.log('false');
//     break

//     default:console.log('dangg');
// }
    
//            ???????????????????FOR LOOP//////////////


// fo r (let index = 0; index < 6; index++) {
//     const element = console.log("hello ");

// }

// number = Number(prompt("Enter the number ") ) ;

// var sum = 0

// for  (let i = 1 ; i <=number; i++ ) {
//     sum = sum + i 
//     console.log(sum);
// }

// let num = prompt("enter the number");

//     let isPrime = true ;

// start
// while(end){ exit control
//     change
// }

// num = Number(prompt("Enter the number"))
// if ( num = 0 ) {
    
// } 
// else  {
//     for ( let  i = 0 ; i <= 5; i++) {
//     console.log('hello');
// }
// }



let goal = {
    amount: 0,
    date: null
};

function setGoal() {
    const amount = document.getElementById('goalAmount').value;
    const date = document.getElementById('goalDate').value;
    
    if (!amount || !date) {
        alert('Please enter both amount and date');
        return;
    }
    
    goal.amount = parseFloat(amount) || 0;
    goal.date = new Date(date);

    // Add animation class
    const displayAmount = document.getElementById('displayAmount');
    displayAmount.style.animation = 'none';
    displayAmount.offsetHeight; // Trigger reflow
    displayAmount.style.animation = 'updateValue 0.5s ease-out';
    
    displayAmount.innerText = `$${goal.amount.toLocaleString()}`;
    updateTimeRemaining();
}

function updateTimeRemaining() {
    const timeLeft = timeRemaining(goal.date);
    document.getElementById('timeRemaining').innerText = timeLeft;
}

function timeRemaining(goalDate) {
    if (!goalDate) return "Please set a goal date";

    const now = new Date();
    const timeDiff = goalDate - now;

    if (timeDiff <= 0) {
        return "Goal date has passed!";
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Fetch and display goals when page loads
window.addEventListener('load', fetchGoals);

async function setGoal() {
    const button = event.target;
    const originalText = button.textContent;
    
    try {
        button.innerHTML = '<div class="loading-spinner"></div>';
        button.disabled = true;
        
        const username = document.getElementById('username').value;
        const title = document.getElementById('goalTitle').value;
        const amount = document.getElementById('goalAmount').value;
        const date = document.getElementById('goalDate').value;
        
        if (!username || !title || !amount || !date) {
            alert('Please fill in all fields');
            return;
        }
        
        const response = await fetch('/api/goals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                title,
                amount: parseFloat(amount),
                date: new Date(date)
            })
        });
        
        if (response.ok) {
            clearInputs();
            fetchGoals();
        }
        
        // Add animation to new goals
        const newGoal = document.querySelector('.goal-item:first-child');
        if (newGoal) {
            newGoal.style.animation = 'none';
            newGoal.offsetHeight; // Trigger reflow
            newGoal.style.animation = 'scaleIn 0.5s ease-out forwards';
        }
    } catch (error) {
        console.error('Error saving goal:', error);
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function fetchGoals() {
    try {
        const response = await fetch('/api/goals');
        if (!response.ok) {
            throw new Error('Failed to fetch goals');
        }
        const goals = await response.json();
        renderGoals(goals);
    } catch (error) {
        console.error('Error fetching goals:', error);
        // Show error message to user
        const goalsList = document.getElementById('goalsList');
        if (goalsList) {
            goalsList.innerHTML = `
                <div class="error-message">
                    Failed to load goals. Please try again later.
                </div>
            `;
        }
    }
}

function renderGoals(goals) {
    const goalsList = document.getElementById('goalsList');
    
    if (!goalsList) {
        console.error('Goals list container not found');
        return;
    }
    
    try {
        goalsList.innerHTML = goals.map((goal, index) => {
            const timeInfo = formatTimeRemaining(goal.date);
            const timeClass = timeInfo.isExpired ? 'expired' : 
                            timeInfo.urgency === 'urgent' ? 'urgent' :
                            timeInfo.urgency === 'warning' ? 'warning' : '';
            
            return `
                <div class="goal-item" style="animation-delay: ${index * 0.1}s" data-date="${goal.date}">
                    <div class="goal-item-header">
                        <div class="goal-item-title">${goal.title || 'Untitled Goal'}</div>
                        <div class="goal-item-user">by ${goal.username || 'Anonymous'}</div>
                    </div>
                    <div class="goal-item-amount">$${(goal.amount || 0).toLocaleString()}</div>
                    <div class="goal-status ${(goal.status || 'Not Started').toLowerCase().replace(' ', '-')}">
                        ${goal.status || 'Not Started'}
                    </div>
                    <div class="goal-time ${timeClass}">
                        <i class="fas fa-clock"></i> ${timeInfo.text}
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${goal.progress || 0}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error rendering goals:', error);
        goalsList.innerHTML = `
            <div class="error-message">
                An error occurred while displaying goals. Please try again later.
            </div>
        `;
    }
}

// Add error handling to fetchGoals
async function fetchGoals() {
    try {
        const response = await fetch('/api/goals');
        if (!response.ok) {
            throw new Error('Failed to fetch goals');
        }
        const goals = await response.json();
        renderGoals(goals);
    } catch (error) {
        console.error('Error fetching goals:', error);
        // Show error message to user
        const goalsList = document.getElementById('goalsList');
        if (goalsList) {
            goalsList.innerHTML = `
                <div class="error-message">
                    Failed to load goals. Please try again later.
                </div>
            `;
        }
    }
}

// Add safe element access
function updateDashboard() {
    const elements = {
        'total-goals': document.getElementById('total-goals'),
        'completed-goals': document.getElementById('completed-goals'),
        'in-progress-goals': document.getElementById('in-progress-goals'),
        'avg-completion': document.getElementById('avg-completion')
    };

    if (!Object.values(elements).every(Boolean)) {
        console.error('Some dashboard elements not found');
        return;
    }

    try {
        // ...rest of updateDashboard code...
    } catch (error) {
        console.error('Error updating dashboard:', error);
        showNotification('Failed to update dashboard', 'error');
    }
}

// Add this function after existing functions
function formatTimeRemaining(date) {
    const now = new Date();
    const target = new Date(date);
    const diff = target - now;
    
    if (diff <= 0) {
        return {
            text: "Goal date has passed!",
            isExpired: true
        };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
        text: `${days}d ${hours}h ${minutes}m remaining`,
        isExpired: false,
        urgency: days <= 3 ? 'urgent' : days <= 7 ? 'warning' : 'normal'
    };
}

// Add this after your existing code
function startTimeUpdates() {
    // Update times every minute
    setInterval(() => {
        const goalItems = document.querySelectorAll('.goal-item');
        goalItems.forEach(item => {
            const timeElement = item.querySelector('.goal-time');
            const dateStr = item.dataset.date;
            if (timeElement && dateStr) {
                const timeInfo = formatTimeRemaining(new Date(dateStr));
                timeElement.className = `goal-time ${timeInfo.isExpired ? 'expired' : timeInfo.urgency}`;
                timeElement.innerHTML = `<i class="fas fa-clock"></i> ${timeInfo.text}`;
            }
        });
    }, 60000); // Update every minute
}

// Add this to your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    startTimeUpdates();
});
