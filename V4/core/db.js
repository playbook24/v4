/**
 * core/db.js
 * VERSION V4 Finale - Base de données avec suppression d'équipe
 */

class ORBDatabase {
    constructor() {
        this.dbName = 'ORB_Playbook_Reset_v4';
        this.db = null;
    }

    async open() {
        return new Promise((resolve, reject) => {
            if (this.db) { resolve(this.db); return; }
            const request = indexedDB.open(this.dbName, 8); 
            request.onerror = (e) => { console.error("Erreur d'ouverture BDD", e); reject("Erreur BDD"); };
            request.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('playbooks')) db.createObjectStore('playbooks', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('trainingPlans')) db.createObjectStore('trainingPlans', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('tags')) db.createObjectStore('tags', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('calendarEvents')) db.createObjectStore('calendarEvents', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('players')) db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('teams')) db.createObjectStore('teams', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('sheets')) db.createObjectStore('sheets', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('sheetTags')) db.createObjectStore('sheetTags', { keyPath: 'id', autoIncrement: true });
            };
        });
    }

    // --- PLAYBOOKS ---
    async savePlaybook(data, preview, id = null) { 
        if (!this.db) await this.open(); 
        let existingTagIds = [];
        let createdAt = new Date().toISOString();
        if (id) {
            try {
                const existing = await this.getPlaybook(id);
                if (existing) { existingTagIds = existing.tagIds || []; createdAt = existing.createdAt || createdAt; }
            } catch(e) {}
        } else if (data.tagIds) { existingTagIds = data.tagIds; }

        return new Promise((res) => { 
            const s = this.db.transaction(['playbooks'], 'readwrite').objectStore('playbooks'); 
            const r = { name: data.name || 'Sans nom', playbookData: data, preview: preview, createdAt: createdAt, tagIds: existingTagIds }; 
            if (id) r.id = id; 
            const req = id ? s.put(r) : s.add(r); 
            req.onsuccess = e => res(e.target.result); 
        }); 
    }
    async getAllPlaybooks() { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['playbooks'], 'readonly').objectStore('playbooks').getAll().onsuccess = e => res(e.target.result); }); }
    async getPlaybook(id) { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['playbooks'], 'readonly').objectStore('playbooks').get(id).onsuccess = e => res(e.target.result); }); }
    async deletePlaybook(id) { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['playbooks'], 'readwrite').objectStore('playbooks').delete(id).onsuccess = () => res(true); }); }
    
    // --- SÉANCES (PLANNER) ---
    async savePlan(data, id = null) { 
        if (!this.db) await this.open(); 
        return new Promise((res, rej) => { 
            const s = this.db.transaction(['trainingPlans'], 'readwrite').objectStore('trainingPlans'); 
            const dataToSave = { ...data };
            if (id) dataToSave.id = id; else delete dataToSave.id; 
            const req = id ? s.put(dataToSave) : s.add(dataToSave); 
            req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e);
        }); 
    }
    async getAllPlans() { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['trainingPlans'], 'readonly').objectStore('trainingPlans').getAll().onsuccess = e => res(e.target.result); }); }
    async getPlan(id) { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['trainingPlans'], 'readonly').objectStore('trainingPlans').get(id).onsuccess = e => res(e.target.result); }); }
    async deletePlan(id) { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['trainingPlans'], 'readwrite').objectStore('trainingPlans').delete(id).onsuccess = () => res(true); }); }

    // --- TAGS ---
    async getAllTags() { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['tags'], 'readonly').objectStore('tags').getAll().onsuccess = e => res(e.target.result); }); }
    async addTag(name) { if (!this.db) await this.open(); return new Promise((res, rej) => { const req = this.db.transaction(['tags'], 'readwrite').objectStore('tags').add({name}); req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e);}); }
    async deleteTag(id) { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['tags'], 'readwrite').objectStore('tags').delete(id).onsuccess = () => res(true); }); }
    async assignTagsToPlaybook(playbookId, tagIds) { if (!this.db) await this.open(); return new Promise(async (res, rej) => { const playbook = await this.getPlaybook(playbookId); if (!playbook) return rej("Introuvable"); playbook.tagIds = tagIds; this.db.transaction(['playbooks'], 'readwrite').objectStore('playbooks').put(playbook).onsuccess = () => res(true); }); }

    // --- CALENDRIER ---
    async saveCalendarEvent(data) {
        if (!this.db) await this.open();
        return new Promise((res, rej) => {
            const s = this.db.transaction(['calendarEvents'], 'readwrite').objectStore('calendarEvents');
            const dataToSave = { ...data };
            if (!dataToSave.id) delete dataToSave.id; 
            const req = dataToSave.id ? s.put(dataToSave) : s.add(dataToSave);
            req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e);
        });
    }
    async getAllCalendarEvents() { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['calendarEvents'], 'readonly').objectStore('calendarEvents').getAll().onsuccess = e => res(e.target.result); }); }
    async deleteCalendarEvent(id) { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['calendarEvents'], 'readwrite').objectStore('calendarEvents').delete(id).onsuccess = () => res(true); }); }

    // --- EFFECTIFS - ÉQUIPES ---
    async saveTeam(data) {
        if (!this.db) await this.open();
        return new Promise((res, rej) => {
            const s = this.db.transaction(['teams'], 'readwrite').objectStore('teams');
            const dataToSave = { ...data };
            if (!dataToSave.id) delete dataToSave.id; 
            const req = dataToSave.id ? s.put(dataToSave) : s.add(dataToSave);
            req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e);
        });
    }
    async getAllTeams() { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['teams'], 'readonly').objectStore('teams').getAll().onsuccess = e => res(e.target.result); }); }
    // NOUVEAU : SUPPRESSION D'ÉQUIPE
    async deleteTeam(id) { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['teams'], 'readwrite').objectStore('teams').delete(id).onsuccess = () => res(true); }); }

    // --- EFFECTIFS - JOUEURS ---
    async savePlayer(data) {
        if (!this.db) await this.open();
        return new Promise((res, rej) => {
            const s = this.db.transaction(['players'], 'readwrite').objectStore('players');
            const dataToSave = { ...data };
            if (!dataToSave.id) delete dataToSave.id; 
            const req = dataToSave.id ? s.put(dataToSave) : s.add(dataToSave);
            req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e);
        });
    }
    async getAllPlayers() { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['players'], 'readonly').objectStore('players').getAll().onsuccess = e => res(e.target.result); }); }
    async deletePlayer(id) { if (!this.db) await this.open(); return new Promise(res => { this.db.transaction(['players'], 'readwrite').objectStore('players').delete(id).onsuccess = () => res(true); }); }
}
const orbDB = new ORBDatabase();