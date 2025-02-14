let currentEditTaskId = null;

// Helper functions for tasks
function getTasks() {
  return JSON.parse(localStorage.getItem("tasks")) || [];
}

function saveTasks(tasks) {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const isDarkMode = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  document.getElementById("darkModeToggle").textContent = isDarkMode
    ? "Switch to Light Mode"
    : "Switch to Dark Mode";
}

function showPage(page) {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("registerPage").style.display = "none";
  document.getElementById("dashboardPage").style.display = "none";
  if (page === "login") {
    document.getElementById("login-error").textContent = "";
    document.getElementById("loginPage").style.display = "block";
  } else if (page === "register") {
    document.getElementById("registerPage").style.display = "block";
  } else if (page === "dashboard") {
    document.getElementById("dashboardPage").style.display = "block";
    loadTeamMembers();
    loadTasks();
  }
}

function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  if (!notification) return;
  notification.textContent = message;
  notification.className = "notification " + type;
  notification.style.display = "block";
  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}

// Validate task input fields and highlight errors
function validateTaskInputs() {
  let valid = true;
  const taskNameInput = document.getElementById("task-name");
  const assignedToInput = document.getElementById("assigned-to");
  const deadlineInput = document.getElementById("deadline");
  const priorityInput = document.getElementById("priority");

  taskNameInput.style.borderColor = "";
  assignedToInput.style.borderColor = "";
  deadlineInput.style.borderColor = "";
  priorityInput.style.borderColor = "";

  if (!taskNameInput.value.trim()) {
    taskNameInput.style.borderColor = "red";
    valid = false;
  }
  if (!assignedToInput.value.trim()) {
    assignedToInput.style.borderColor = "red";
    valid = false;
  }
  if (!deadlineInput.value) {
    deadlineInput.style.borderColor = "red";
    valid = false;
  } else {
    const dateValue = new Date(deadlineInput.value);
    if (isNaN(dateValue.getTime())) {
      deadlineInput.style.borderColor = "red";
      valid = false;
    }
  }
  if (!priorityInput.value.trim()) {
    priorityInput.style.borderColor = "red";
    valid = false;
  }
  if (!valid) {
    showNotification("Please fill in all required fields correctly.", "error");
  }
  return valid;
}

// Handle task form submission: add new or save changes
function submitTask(e) {
  e.preventDefault();
  if (currentEditTaskId) {
    saveTaskChanges(currentEditTaskId);
  } else {
    addTask();
  }
}

// Clear task form inputs and reset form
function clearTaskForm() {
  document.getElementById("task-name").value = "";
  document.getElementById("assigned-to").value = "";
  document.getElementById("deadline").value = "";
  document.getElementById("priority").value = "Medium";
  document.getElementById("task-submit-btn").textContent = "Add Task";
  currentEditTaskId = null;
}

function addTask() {
  if (!validateTaskInputs()) return;
  const taskName = document.getElementById("task-name").value.trim();
  const assignedTo = document.getElementById("assigned-to").value;
  const deadline = document.getElementById("deadline").value;
  const priority = document.getElementById("priority").value;
  const task = {
    id: Date.now(),
    name: taskName,
    assignedTo,
    deadline,
    priority,
    completed: false
  };
  let tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);
  clearTaskForm();
  loadTasks();
  loadTeamMembers(); // Update team member task counts
  showNotification("Task added successfully", "success");
}

function loadTasks() {
  let tasks = getTasks();
  const sortBy = document.getElementById("sort-tasks")
    ? document.getElementById("sort-tasks").value
    : "name";
  const searchQuery = document.getElementById("search-task")
    ? document.getElementById("search-task").value.toLowerCase()
    : "";
  const filterMember = document.getElementById("filter-member")
    ? document.getElementById("filter-member").value
    : "";

  let incompleteTasks = tasks.filter(task => !task.completed);
  let completedTasks = tasks.filter(task => task.completed);

  incompleteTasks = incompleteTasks.filter(task =>
    task.name.toLowerCase().includes(searchQuery) &&
    (filterMember === "" || task.assignedTo === filterMember)
  );

  if (sortBy === "priority") {
    incompleteTasks.sort((a, b) => a.priority.localeCompare(b.priority));
  } else if (sortBy === "name") {
    incompleteTasks.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "dueDate") {
    incompleteTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }

  const tasksList = document.getElementById("tasks");
  tasksList.innerHTML = "";
  incompleteTasks.forEach(task => {
    const li = document.createElement("li");
    if (new Date(task.deadline) < new Date()) {
      li.classList.add("overdue");
    }
    li.innerHTML = `
      <span>${task.name}</span>
      <div>
        (Assigned to: ${task.assignedTo}, Deadline: ${task.deadline}, Priority: ${task.priority})
        <button onclick="toggleCompletion('${task.id}')">Complete</button>
        <button onclick="editTask('${task.id}')">Edit</button>
        <button onclick="deleteTask('${task.id}')">Delete</button>
      </div>
    `;
    tasksList.appendChild(li);
  });

  const completedTasksList = document.getElementById("completed-tasks-list");
  completedTasksList.innerHTML = "";
  completedTasks.forEach(task => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span style="text-decoration: line-through;">${task.name}</span>
      <div>
        (Assigned to: ${task.assignedTo}, Deadline: ${task.deadline}, Priority: ${task.priority})
        <button onclick="toggleCompletion('${task.id}')">Undo</button>
        <button onclick="deleteTask('${task.id}')">Delete</button>
      </div>
    `;
    completedTasksList.appendChild(li);
  });

  updateTaskSummary(incompleteTasks, completedTasks);
}

function toggleCompletion(taskId) {
  let tasks = getTasks();
  // Compare IDs as strings to avoid type mismatches
  const taskIndex = tasks.findIndex(t => String(t.id) === String(taskId));
  if (taskIndex !== -1) {
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    saveTasks(tasks);
    loadTasks();
    loadTeamMembers(); // Update team member counts
    showNotification(
      tasks[taskIndex].completed ? "Task marked as complete" : "Task marked as incomplete",
      "success"
    );
  }
}

function editTask(taskId) {
  let tasks = getTasks();
  // Compare IDs as strings
  const task = tasks.find(t => String(t.id) === String(taskId));
  if (!task) return;
  currentEditTaskId = taskId;
  document.getElementById("task-name").value = task.name;
  document.getElementById("assigned-to").value = task.assignedTo;
  document.getElementById("deadline").value = task.deadline;
  document.getElementById("priority").value = task.priority;
  document.getElementById("task-submit-btn").textContent = "Save Changes";
  document.querySelector(".task-input").scrollIntoView({ behavior: "smooth" });
}

function saveTaskChanges(taskId) {
  if (!validateTaskInputs()) return;
  let tasks = getTasks();
  // Compare IDs as strings
  const taskIndex = tasks.findIndex(t => String(t.id) === String(taskId));
  if (taskIndex === -1) return;
  tasks[taskIndex].name = document.getElementById("task-name").value.trim();
  tasks[taskIndex].assignedTo = document.getElementById("assigned-to").value;
  tasks[taskIndex].deadline = document.getElementById("deadline").value;
  tasks[taskIndex].priority = document.getElementById("priority").value;
  saveTasks(tasks);
  clearTaskForm();
  loadTasks();
  loadTeamMembers(); // Update team member counts
  showNotification("Task updated successfully", "success");
}

function deleteTask(taskId) {
  let tasks = getTasks();
  // Filter using string comparison for IDs
  tasks = tasks.filter(t => String(t.id) !== String(taskId));
  saveTasks(tasks);
  loadTasks();
  loadTeamMembers(); // Update team member counts
  showNotification("Task deleted successfully", "success");
}

function updateTaskSummary(incompleteTasks, completedTasks) {
  const total = incompleteTasks.length + completedTasks.length;
  document.getElementById("total-tasks").textContent = total;
  document.getElementById("pending-tasks").textContent = incompleteTasks.length;
  document.getElementById("completed-tasks-count").textContent = completedTasks.length;
  const progress = total ? (incompleteTasks.length / total) * 100 : 0;
  document.getElementById("task-progress-bar").value = progress;
}

function addTeamMember() {
  const teamMemberInput = document.getElementById("team-member");
  const teamMemberName = teamMemberInput.value.trim();
  if (teamMemberName) {
    let teamMembers = JSON.parse(localStorage.getItem("teamMembers")) || [];
    if (!teamMembers.includes(teamMemberName)) {
      teamMembers.push(teamMemberName);
      localStorage.setItem("teamMembers", JSON.stringify(teamMembers));
      teamMemberInput.value = "";
      loadTeamMembers();
      showNotification("Team member added successfully", "success");
    } else {
      showNotification("Team member already exists!", "error");
    }
  }
}

function loadTeamMembers() {
  const membersList = document.getElementById("members-list");
  const assignToSelect = document.getElementById("assigned-to");
  const filterSelect = document.getElementById("filter-member");
  if (!membersList || !assignToSelect || !filterSelect) return;
  membersList.innerHTML = "";
  assignToSelect.innerHTML = "";
  filterSelect.innerHTML = '<option value="">All Members</option>';
  let teamMembers = JSON.parse(localStorage.getItem("teamMembers")) || [];
  let tasks = getTasks();
  teamMembers.forEach(member => {
    // Normalize member name for comparison
    const normalizedMember = member.trim().toLowerCase();
    const memberTasks = tasks.filter(
      task =>
        task.assignedTo &&
        task.assignedTo.trim().toLowerCase() === normalizedMember
    );
    const completedTasks = memberTasks.filter(task => task.completed).length;
    const li = document.createElement("li");
    li.innerHTML = `
      ${member} 
      <span class="progress-container">
        <progress value="${memberTasks.length ? (completedTasks / memberTasks.length) * 100 : 0}" max="100"></progress>
        (${completedTasks}/${memberTasks.length} tasks)
      </span>
      <button onclick="removeTeamMember('${member}')">✖</button>
    `;
    membersList.appendChild(li);
    const optionAssign = document.createElement("option");
    optionAssign.value = member;
    optionAssign.textContent = member;
    assignToSelect.appendChild(optionAssign);
    const optionFilter = document.createElement("option");
    optionFilter.value = member;
    optionFilter.textContent = member;
    filterSelect.appendChild(optionFilter);
  });
}

function removeTeamMember(member) {
  let tasks = getTasks();
  const normalizedMember = member.trim().toLowerCase();
  const pendingTasks = tasks.filter(
    task =>
      !task.completed &&
      task.assignedTo &&
      task.assignedTo.trim().toLowerCase() === normalizedMember
  );
  if (pendingTasks.length > 0) {
    showNotification("Cannot remove team member: There are pending tasks assigned to them", "error");
    return;
  }
  let teamMembers = JSON.parse(localStorage.getItem("teamMembers")) || [];
  teamMembers = teamMembers.filter(m => m.trim().toLowerCase() !== normalizedMember);
  localStorage.setItem("teamMembers", JSON.stringify(teamMembers));
  loadTeamMembers();
  showNotification("Team member removed successfully", "success");
}

function register(e) {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;
  
  fetch('http://localhost:3000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Registration successful') {
        showNotification(data.message, "success");
        showPage("login");
      } else {
        document.getElementById("register-error").textContent = data.message;
        showNotification(data.message, "error");
      }
    })
    .catch(err => {
      console.error(err);
      showNotification("Error registering user", "error");
    });
}

function login(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  
  if (username === "admin" && password === "admin123") {
    localStorage.setItem("token", "admin-token");
    showNotification("Admin login successful!", "success");
    showPage("dashboard");
    return;
  }
  
  fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(response => {
      if (response.ok) return response.json();
      throw new Error("Invalid credentials");
    })
    .then(data => {
      localStorage.setItem("token", "user-token");
      showNotification("Login successful!", "success");
      showPage("dashboard");
    })
    .catch(err => {
      document.getElementById("login-error").textContent = "Invalid credentials, try again.";
    });
}

function exportData() {
  let tasks = getTasks();
  let teamMembers = JSON.parse(localStorage.getItem("teamMembers")) || [];
  let data = { tasks, teamMembers };
  let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  let downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "task_data.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
}

function importData(event) {
  let file = event.target.files[0];
  let reader = new FileReader();
  reader.onload = function(e) {
    try {
      let importedData = JSON.parse(e.target.result);
      if (importedData.tasks && importedData.teamMembers) {
        localStorage.setItem("tasks", JSON.stringify(importedData.tasks));
        localStorage.setItem("teamMembers", JSON.stringify(importedData.teamMembers));
        loadTasks();
        loadTeamMembers();
        updateTaskSummary(
          importedData.tasks.filter(t => !t.completed),
          importedData.tasks.filter(t => t.completed)
        );
        showNotification("Data imported successfully", "success");
      } else {
        showNotification("Invalid file format", "error");
      }
    } catch (err) {
      showNotification("Error reading file.", "error");
    }
  };
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    document.getElementById("darkModeToggle").textContent = "Switch to Light Mode";
  } else {
    document.body.classList.remove("dark-mode");
    document.getElementById("darkModeToggle").textContent = "Switch to Dark Mode";
  }
  showPage("login");

  document.querySelectorAll("input").forEach((input) => {
    if (!["login-username", "login-password", "register-username", "register-password"].includes(input.id)) {
      if (input.id !== "team-member") {
        input.addEventListener("blur", (e) => {
          if (e.target.value.length > 0) {
            e.target.value = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1);
          }
        });
      }
    }
  });

  const teamMemberInput = document.getElementById("team-member");
  if (teamMemberInput) {
    teamMemberInput.addEventListener("blur", (e) => {
      let words = e.target.value.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        if (words[i].length > 0)
          words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
      }
      e.target.value = words.join(" ");
    });
  }
});
