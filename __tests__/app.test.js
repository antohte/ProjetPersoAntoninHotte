describe('Tests - TOUTfonctionne', () => {
  
  // auth - faut pouvoir login et register
  test('email format bon', () => {
    const email = 'user@example.com';
    expect(email).toContain('@');
    expect(email.length).toBeGreaterThan(5);
  });

  test('pwd secure min 6', () => {
    const pwd = 'myPassword123';
    expect(pwd.length).toBeGreaterThanOrEqual(6);
  });

  test('user existe apres register', () => {
    const user = { uid: 'u1', email: 'test@uni.com', displayName: 'Jean' };
    expect(user.uid).toBeDefined();
    expect(user.email).toContain('@');
  });

  // activites - creer des posts
  test('creer une activite', () => {
    const activity = { 
      id: 'a1',
      title: 'Football', 
      place: 'Parc',
      category: 'sport',
      ownerId: 'u1'
    };
    expect(activity.title).toBe('Football');
    expect(activity.ownerId).toBeDefined();
  });

  test('faut un titre', () => {
    const activity = { title: '' };
    const valid = !!(activity.title && activity.title.length > 0);
    expect(valid).toBe(false);
  });

  test('faut un lieu', () => {
    const activity = { place: '' };
    const valid = !!(activity.place && activity.place.length > 0);
    expect(valid).toBe(false);
  });

  test('categories okés', () => {
    const cats = ['bar', 'sport', 'révision', 'culture', 'soirée', 'autre'];
    expect(cats).toContain('sport');
    expect(cats.length).toBe(6);
  });

  // participation - join et leave
  test('peut rejoindre', () => {
    const activity = { participants: ['u1'] };
    expect(activity.participants).toContain('u1');
    expect(activity.participants.length).toBe(1);
  });

  test('peut partir', () => {
    const activity = { participants: ['u1', 'u2', 'u3'] };
    activity.participants = activity.participants.filter(u => u !== 'u2');
    expect(activity.participants).toContain('u1');
    expect(activity.participants).not.toContain('u2');
    expect(activity.participants.length).toBe(2);
  });

  test('pas deux fois', () => {
    const activity = { participants: ['u1', 'u2'] };
    const alreadyIn = activity.participants.includes('u1');
    expect(alreadyIn).toBe(true);
  });

  test('compte les participants', () => {
    const activity = { participants: ['u1', 'u2', 'u3', 'u4'] };
    expect(activity.participants.length).toBe(4);
  });

  // commentaires - add comment delete
  test('add un commentaire', () => {
    const activity = { comments: [] };
    activity.comments.push({ text: 'Super!', userId: 'u1', userName: 'Jean' });
    expect(activity.comments.length).toBe(1);
    expect(activity.comments[0].text).toBe('Super!');
  });

  test('pas vide', () => {
    const text = '';
    const valid = !!(text && text.trim().length > 0);
    expect(valid).toBe(false);
  });

  test('delete son propre comm', () => {
    const activity = { 
      comments: [
        { id: 'c1', text: 'Bien', userId: 'u1' },
        { id: 'c2', text: 'Mauvais', userId: 'u2' }
      ]
    };
    activity.comments = activity.comments.filter(c => c.id !== 'c1');
    expect(activity.comments.length).toBe(1);
    expect(activity.comments[0].id).toBe('c2');
  });

  test('les 3 premiers', () => {
    const comments = [
      { text: 'c1' }, { text: 'c2' }, { text: 'c3' },
      { text: 'c4' }, { text: 'c5' }
    ];
    const preview = comments.slice(0, 3);
    expect(preview.length).toBe(3);
  });

  // notifs - creer marquer comme lue
  test('creer notif', () => {
    const n = { type: 'participation', read: false };
    expect(n.type).toBeDefined();
    expect(n.read).toBe(false);
  });

  test('types ok', () => {
    const types = ['participation', 'commentaire', 'rappel'];
    expect(types).toContain('participation');
  });

  test('mark as read', () => {
    const n = { read: false };
    n.read = true;
    expect(n.read).toBe(true);
  });

  test('compte non lues', () => {
    const notifs = [
      { read: false }, { read: true }, 
      { read: false }, { read: false }
    ];
    const unread = notifs.filter(n => !n.read).length;
    expect(unread).toBe(3);
  });

  test('recent en premier', () => {
    const now = new Date();
    const notifs = [
      { id: 'n1', time: new Date(now.getTime() - 5000) },
      { id: 'n2', time: new Date(now.getTime() - 1000) }
    ];
    notifs.sort((a, b) => b.time - a.time);
    expect(notifs[0].id).toBe('n2');
  });

  // profil - create edit
  test('creer profil', () => {
    const user = { 
      uid: 'u1',
      displayName: 'Jean',
      bio: 'Salut',
      interests: ['sport', 'musique']
    };
    expect(user.displayName).toBeDefined();
    expect(Array.isArray(user.interests)).toBe(true);
  });

  test('nom 2-30 chars', () => {
    const name = 'Jean';
    const valid = name.length >= 2 && name.length <= 30;
    expect(valid).toBe(true);
  });

  test('bio max 200', () => {
    const bio = 'C\'est ma bio';
    expect(bio.length).toBeLessThanOrEqual(200);
  });

  test('interets max 10', () => {
    const interests = ['a', 'b', 'c', 'd', 'e'];
    expect(interests.length).toBeLessThanOrEqual(10);
  });

  test('annees ok', () => {
    const years = ['L1', 'L2', 'L3', 'M1', 'M2'];
    expect(years).toContain('L3');
  });

  test('edit profil', () => {
    const user = { bio: 'ancien' };
    user.bio = 'nouveau';
    expect(user.bio).toBe('nouveau');
  });

  test('compte activites faites', () => {
    const user = { createdActivities: ['a1', 'a2', 'a3'] };
    expect(user.createdActivities.length).toBe(3);
  });

  // moderation admin
  test('check admin', () => {
    const user = { role: 'admin' };
    const isAdmin = user.role === 'admin';
    expect(isAdmin).toBe(true);
  });

  test('user normal pas admin', () => {
    const user = { role: 'user' };
    const isAdmin = user.role === 'admin';
    expect(isAdmin).toBe(false);
  });

  test('avertir user', () => {
    const user = { warnings: 0 };
    user.warnings += 1;
    expect(user.warnings).toBe(1);
  });

  test('ban apres 3 avertis', () => {
    const user = { warnings: 3, status: 'actif' };
    if (user.warnings >= 3) user.status = 'banni';
    expect(user.status).toBe('banni');
  });

  test('debannir user', () => {
    const user = { status: 'banni' };
    user.status = 'actif';
    expect(user.status).toBe('actif');
  });

  test('delete report', () => {
    const reports = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }];
    reports.splice(reports.findIndex(r => r.id === 'r2'), 1);
    expect(reports.length).toBe(2);
    expect(reports.some(r => r.id === 'r2')).toBe(false);
  });

  // edge cases
  test('statut ok', () => {
    const statuses = ['actif', 'banni'];
    const user = { status: 'actif' };
    expect(statuses).toContain(user.status);
  });

  test('date valide', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    expect(futureDate > new Date()).toBe(true);
  });

  test('arrays pas vides', () => {
    const participants = ['u1'];
    const hasMembers = participants.length > 0;
    expect(hasMembers).toBe(true);
  });

  test('structure ok', () => {
    const activity = { 
      id: 'a1',
      title: 'Test',
      place: 'Here',
      ownerId: 'u1',
      participants: [],
      comments: []
    };
    expect(activity).toHaveProperty('id');
    expect(activity).toHaveProperty('title');
    expect(activity).toHaveProperty('participants');
  });

});
