import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc,
  writeBatch 
} from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const firebaseConfig = {
  apiKey: "AIzaSyDP8Pwk3HBdBaanTpK5D_73T3lfhWn61-A",
  authDomain: "time-9b710.firebaseapp.com",
  projectId: "time-9b710",
  storageBucket: "time-9b710.firebasestorage.app",
  messagingSenderId: "259284588594",
  appId: "1:259284588594:web:a59472bb94bcd1c26ac42b",
  measurementId: "G-5E76V8Q5EG"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const backendDataPath = join(projectRoot, 'backend', 'data');

console.log('Текущая директория скрипта:', __dirname);
console.log('Корень проекта:', projectRoot);
console.log('Путь к данным:', backendDataPath);
console.log('');
if (!existsSync(backendDataPath)) {
  console.error('Папка backend/data не найдена!');
  console.error(`   Ищем по пути: ${backendDataPath}`);
  console.log('');
  console.log('Структура проекта должна быть такой:');
  console.log('   time tracker/');
  console.log('   ├── backend/');
  console.log('   │   └── data/');
  console.log('   │       ├── users.json');
  console.log('   │       ├── projects.json');
  console.log('   │       └── timeEntries.json');
  console.log('   └── frontend/');
  console.log('       └── scripts/');
  console.log('           └── migrate.js');
  process.exit(1);
}

// Проверяем наличие файлов
const files = ['users.json', 'projects.json', 'timeEntries.json'];
for (const file of files) {
  const filePath = join(backendDataPath, file);
  if (!existsSync(filePath)) {
    console.error(`Файл ${file} не найден в ${backendDataPath}`);
    process.exit(1);
  }
}
console.log('Чтение файлов...');
const usersData = JSON.parse(readFileSync(join(backendDataPath, 'users.json'), 'utf8'));
const projectsData = JSON.parse(readFileSync(join(backendDataPath, 'projects.json'), 'utf8'));
const timeEntriesData = JSON.parse(readFileSync(join(backendDataPath, 'timeEntries.json'), 'utf8'));

console.log(`Найдено: ${usersData.length} пользователей, ${projectsData.length} проектов, ${timeEntriesData.length} записей\n`);
async function migrateUsers() {
  console.log('Миграция пользователей...');
  const batch = writeBatch(db);
  let count = 0;
  for (const user of usersData) {
    const userId = user.id || user._id || String(user.userId) || `user_${Date.now()}_${Math.random()}`;
    const docRef = doc(db, 'users', userId);
    const userData = {
      username: user.username || user.name || 'User',
      email: user.email || `user${Date.now()}@example.com`,
      theme: user.theme || 'light',
      avatar: user.avatar || '',
      createdAt: user.createdAt || user.created_at || new Date().toISOString()
    };
    batch.set(docRef, userData);
    count++;
    console.log(`${userData.username} (${userId})`);
  }
  await batch.commit();
  console.log(`${count} пользователей добавлено\n`);
}
async function migrateProjects() {
  console.log('Миграция проектов...');
  const batch = writeBatch(db);
  let count = 0;
  for (const project of projectsData) {
    const projectId = project.id || project._id || String(project.projectId) || `project_${Date.now()}_${Math.random()}`;
    const docRef = doc(db, 'projects', projectId);
    const userId = project.userId || project.user_id || project.ownerId || project.owner_id;
    if (!userId) {
      console.warn(`Проект "${project.name || 'Без названия'}" не имеет userId, пропускаем`);
      continue;
    }
    const projectData = {
      name: project.name || 'Без названия',
      color: project.color || '#4361ee',
      description: project.description || '',
      userId: String(userId),
      completed: project.completed || false,
      completedAt: project.completedAt || project.completed_at || null,
      deadline: project.deadline || null,
      createdAt: project.createdAt || project.created_at || new Date().toISOString(),
      lastActivity: project.lastActivity || project.last_activity || new Date().toISOString()
    };
    batch.set(docRef, projectData);
    count++;
    console.log(`${projectData.name} (${projectId})`);
  }
  await batch.commit();
  console.log(`${count} проектов добавлено\n`);
}
async function migrateTimeEntries() {
  console.log('Миграция временных записей...');
  const batch = writeBatch(db);
  let count = 0;
  for (const entry of timeEntriesData) {
    const entryId = entry.id || entry._id || String(entry.entryId) || `entry_${Date.now()}_${Math.random()}`;
    const docRef = doc(db, 'timeEntries', entryId);
    const userId = entry.userId || entry.user_id || entry.ownerId || entry.owner_id;
    if (!userId) {
      console.warn(`Запись ${entryId} не имеет userId, пропускаем`);
      continue;
    }
    const entryData = {
      projectId: String(entry.projectId || entry.project_id || ''),
      userId: String(userId),
      startTime: entry.startTime || entry.start_time || new Date().toISOString(),
      endTime: entry.endTime || entry.end_time || new Date().toISOString(),
      duration: Number(entry.duration) || 0,
      note: entry.note || '',
      createdAt: entry.createdAt || entry.created_at || new Date().toISOString()
    };
    batch.set(docRef, entryData);
    count++;
    console.log(`Запись ${entryId} (${entryData.duration} мин)`);
  }
  await batch.commit();
  console.log(`${count} записей добавлено\n`);
}
async function migrate() {
  console.log('Начинаем миграцию данных в Firestore...\n');
  console.log('Убедитесь, что Firebase настроен правильно!');
  console.log(`Project ID: ${firebaseConfig.projectId}`);
  console.log('');
  try {
    await migrateUsers();
    await migrateProjects();
    await migrateTimeEntries();
    console.log('Миграция успешно завершена!');
    console.log('Проверьте данные в Firebase Console:');
    console.log(`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);
  } catch (error) {
    console.error('Ошибка миграции:', error.message);
    if (error.code === 'ENOENT') {
      console.log('\n Проверьте, что файлы существуют по пути:', backendDataPath);
      console.log('   Ожидаемые файлы:');
      console.log('   - users.json');
      console.log('   - projects.json');
      console.log('   - timeEntries.json');
    } else if (error.code === 'permission-denied') {
      console.log('\n Ошибка доступа к Firestore:');
      console.log('   1. Проверьте, что вы вошли в Firebase');
      console.log('   2. Проверьте правила безопасности в Firestore');
      console.log('   3. Убедитесь, что проект в тестовом режиме');
    }
  }
}
migrate();
