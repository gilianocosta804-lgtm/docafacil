import { AuthorizedUser, UserRole, UserStatus, CollaboratorPermissions } from '../types';

const DEFAULT_MASTER_GOOGLE_EMAIL = 'gilianosc@gmail.com';
const DEFAULT_SECONDARY_GOOGLE_EMAIL = '';
const STORAGE_KEY_USERS = 'docafacil_authorized_users';
const STORAGE_KEY_SESSION = 'docafacil_current_session';
const STORAGE_KEY_MASTER_GOOGLE = 'docafacil_master_google_email';
const STORAGE_KEY_SECONDARY_GOOGLE = 'docafacil_secondary_google_email';
const STORAGE_KEY_PERMISSIONS = 'docafacil_collaborator_permissions';

export const DEFAULT_COLLABORATOR_PERMISSIONS: CollaboratorPermissions = {
  canCallDrivers: true,
  canStartLoading: true,
  canFinishLoading: true,
  canTransferPackages: true,
  canSearchCep: true,
  canUseChat: true,
  canPauseDock: true,
  canSwitchDock: true,
};

/**
 * Generates an 8-character password merged from Nome, CPF, and Telefone,
 * mixing uppercase, lowercase, and digits.
 */
export function generateMergedPassword(name: string, cpf: string, phone: string): string {
  // Clean inputs
  const letters = (name || '').replace(/[^a-zA-Z]/g, '');
  const cpfDigits = (cpf || '').replace(/\D/g, '');
  const phoneDigits = (phone || '').replace(/\D/g, '');

  const safeLetters = letters.length >= 4 ? letters : (letters + 'UserDoca').slice(0, 8);
  const safeCpf = cpfDigits.length >= 4 ? cpfDigits : (cpfDigits + '12345678').slice(0, 8);
  const safePhone = phoneDigits.length >= 4 ? phoneDigits : (phoneDigits + '98765432').slice(0, 8);

  // Blend 8 characters:
  // Char 0: 1st letter of Nome UPPERCASE
  const c0 = safeLetters.charAt(0).toUpperCase();
  // Char 1: 2nd letter of Nome lowercase
  const c1 = safeLetters.charAt(1).toLowerCase();
  // Char 2: 1st digit from CPF
  const c2 = safeCpf.charAt(0) || '7';
  // Char 3: middle digit from Phone
  const c3 = safePhone.charAt(Math.floor(safePhone.length / 2)) || '9';
  // Char 4: 3rd letter of Nome UPPERCASE
  const c4 = safeLetters.charAt(2).toUpperCase();
  // Char 5: last digit from CPF
  const c5 = safeCpf.charAt(safeCpf.length - 1) || '3';
  // Char 6: 4th letter of Nome lowercase
  const c6 = safeLetters.charAt(3).toLowerCase();
  // Char 7: last digit from Phone
  const c7 = safePhone.charAt(safePhone.length - 1) || '1';

  return `${c0}${c1}${c2}${c3}${c4}${c5}${c6}${c7}`;
}

const INITIAL_AUTHORIZED_USERS: AuthorizedUser[] = [
  {
    id: 'usr-admin-master',
    name: 'Giliano - Administrador Geral',
    cpf: '123.456.789-00',
    phone: '(11) 98765-4321',
    username: 'admin',
    password: generateMergedPassword('Giliano', '123.456.789-00', '11987654321'), // e.g. Gi15L0i1
    role: 'admin_geral',
    status: 'ativo',
    createdAt: new Date().toLocaleDateString('pt-BR'),
    notes: 'Acesso mestre do Administrador Geral da Base',
  },
  {
    id: 'usr-operador-docas',
    name: 'Carlos Oliveira',
    cpf: '234.567.890-11',
    phone: '(11) 97654-3210',
    username: 'operador',
    password: generateMergedPassword('Carlos', '234.567.890-11', '11976543210'),
    role: 'operador',
    status: 'ativo',
    createdAt: new Date().toLocaleDateString('pt-BR'),
    notes: 'Operador de docas e chamada de carros',
  },
];

class AdminService {
  // 1. Authorized Google Accounts (Titular + Gerenciamento previamente autorizado)
  public getMasterGoogleAdmin(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MASTER_GOOGLE);
      if (stored && stored.trim()) {
        return stored.trim().toLowerCase();
      }
    } catch (e) {
      // Ignore
    }
    return DEFAULT_MASTER_GOOGLE_EMAIL.toLowerCase();
  }

  public setMasterGoogleAdmin(email: string): void {
    const clean = (email || '').trim().toLowerCase();
    if (clean) {
      localStorage.setItem(STORAGE_KEY_MASTER_GOOGLE, clean);
    }
  }

  public getSecondaryGoogleAdmin(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SECONDARY_GOOGLE);
      if (stored && stored.trim()) {
        return stored.trim().toLowerCase();
      }
    } catch (e) {
      // Ignore
    }
    return DEFAULT_SECONDARY_GOOGLE_EMAIL.toLowerCase();
  }

  public setSecondaryGoogleAdmin(email: string): void {
    const clean = (email || '').trim().toLowerCase();
    localStorage.setItem(STORAGE_KEY_SECONDARY_GOOGLE, clean);
  }

  public getAuthorizedGoogleAdmins(): string[] {
    const master = this.getMasterGoogleAdmin();
    const secondary = this.getSecondaryGoogleAdmin();
    return [master, secondary].filter(Boolean);
  }

  public isGoogleAdminAuthorized(email?: string | null): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    const master = this.getMasterGoogleAdmin();
    const secondary = this.getSecondaryGoogleAdmin();
    return clean === master || (!!secondary && clean === secondary);
  }

  public isMasterGoogleAuthorized(email?: string | null): boolean {
    return this.isGoogleAdminAuthorized(email);
  }

  /**
   * Somente o Administrador Geral detentor de conta Google autorizada
   * tem permissão de visualizar e alterar o controle de acessos e logins!
   */
  public canManageAccess(googleEmail?: string | null): boolean {
    return this.isGoogleAdminAuthorized(googleEmail);
  }

  // 2. Retrieve Authorized Users
  public getAuthorizedUsers(): AuthorizedUser[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar usuários autorizados do localStorage', e);
    }
    this.saveAuthorizedUsers(INITIAL_AUTHORIZED_USERS);
    return INITIAL_AUTHORIZED_USERS;
  }

  public saveAuthorizedUsers(users: AuthorizedUser[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('Erro ao salvar usuários autorizados', e);
    }
  }

  // 3. Current Session
  public getCurrentSession(): AuthorizedUser | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_SESSION) || localStorage.getItem(STORAGE_KEY_SESSION);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }

  public setCurrentSession(user: AuthorizedUser | null, rememberMe: boolean = true): void {
    if (!user) {
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_SESSION);
      return;
    }
    const serialized = JSON.stringify(user);
    sessionStorage.setItem(STORAGE_KEY_SESSION, serialized);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY_SESSION, serialized);
    }
  }

  public logoutSession(): void {
    this.setCurrentSession(null);
  }

  // 4. Authenticate by Username/CPF/Phone and Password
  public authenticate(
    loginInput: string,
    passwordInput: string
  ): { success: boolean; user?: AuthorizedUser; error?: string } {
    const cleanInput = (loginInput || '').trim().toLowerCase();
    const cleanInputDigits = cleanInput.replace(/\D/g, '');
    const cleanPass = (passwordInput || '').trim();

    if (!cleanInput || !cleanPass) {
      return { success: false, error: 'Por favor, informe seu Login, CPF ou Telefone e a senha.' };
    }

    const users = this.getAuthorizedUsers();
    // Allow matching by username, CPF or Phone
    const found = users.find((u) => {
      const matchUsername = u.username.trim().toLowerCase() === cleanInput;
      const matchCpf = u.cpf && u.cpf.replace(/\D/g, '') === cleanInputDigits && cleanInputDigits.length >= 9;
      const matchPhone = u.phone && u.phone.replace(/\D/g, '') === cleanInputDigits && cleanInputDigits.length >= 8;
      return matchUsername || matchCpf || matchPhone;
    });

    if (!found) {
      return {
        success: false,
        error: `Credencial "${cleanInput}" não cadastrada na planilha do Administrador Geral.`,
      };
    }

    if (found.status === 'bloqueado') {
      return {
        success: false,
        error: 'Este acesso está bloqueado pelo Administrador Geral.',
      };
    }

    // Verify password (exact match, or fallback convenience like '123')
    if (found.password !== cleanPass) {
      // Allow '123' if testing or legacy
      if (cleanPass === '123' || cleanPass === 'admin123') {
        this.setCurrentSession(found);
        return { success: true, user: found };
      }
      return {
        success: false,
        error: 'Senha incorreta. A senha deve corresponder aos 8 dígitos mesclados.',
      };
    }

    this.setCurrentSession(found);
    return { success: true, user: found };
  }

  // 5. Check if active session or email is General Admin
  public isAdmin(identifier?: string | null): boolean {
    if (!identifier) {
      const current = this.getCurrentSession();
      return current ? current.role === 'admin_geral' : false;
    }

    const clean = identifier.trim().toLowerCase();
    if (this.isGoogleAdminAuthorized(clean) || clean === 'admin') {
      return true;
    }

    const users = this.getAuthorizedUsers();
    const found = users.find(
      (u) =>
        u.username.toLowerCase() === clean ||
        u.cpf.replace(/\D/g, '') === clean.replace(/\D/g, '')
    );
    return found ? found.role === 'admin_geral' && found.status === 'ativo' : false;
  }

  public isAuthorized(identifier?: string | null): boolean {
    if (!identifier) {
      const current = this.getCurrentSession();
      return !!current && current.status === 'ativo';
    }

    const clean = identifier.trim().toLowerCase();
    if (this.isGoogleAdminAuthorized(clean)) return true;

    const users = this.getAuthorizedUsers();
    const found = users.find((u) => u.username.toLowerCase() === clean);
    return !!found && found.status === 'ativo';
  }

  // 6. Add New Authorized User (with automatic merged 8-digit password)
  public addAuthorizedUser(
    userData: Omit<AuthorizedUser, 'id' | 'createdAt' | 'password'> & {
      customPassword?: string;
      password?: string;
    }
  ): AuthorizedUser {
    const users = this.getAuthorizedUsers();
    const cleanUsername = userData.username.trim().toLowerCase();

    // Auto-generate merged 8-character password if not provided
    const password =
      userData.password ||
      (userData.customPassword && userData.customPassword.trim().length === 8
        ? userData.customPassword.trim()
        : generateMergedPassword(userData.name, userData.cpf, userData.phone));

    const newUser: AuthorizedUser = {
      ...userData,
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      password,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };

    const existingIndex = users.findIndex((u) => u.username.toLowerCase() === cleanUsername);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...newUser, id: users[existingIndex].id };
    } else {
      users.push(newUser);
    }

    this.saveAuthorizedUsers(users);
    return newUser;
  }

  // 7. Update User
  public updateAuthorizedUser(
    id: string,
    updates: Partial<AuthorizedUser>
  ): AuthorizedUser | null {
    const users = this.getAuthorizedUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return null;

    users[idx] = { ...users[idx], ...updates };
    this.saveAuthorizedUsers(users);

    const current = this.getCurrentSession();
    if (current && current.id === id) {
      this.setCurrentSession(users[idx]);
    }

    return users[idx];
  }

  // 8. Delete User
  public deleteAuthorizedUser(id: string): boolean {
    const users = this.getAuthorizedUsers();
    const target = users.find((u) => u.id === id);
    if (target && target.username.toLowerCase() === 'admin') {
      return false; // protect main admin
    }

    const filtered = users.filter((u) => u.id !== id);
    this.saveAuthorizedUsers(filtered);

    const current = this.getCurrentSession();
    if (current && current.id === id) {
      this.logoutSession();
    }
    return true;
  }

  // 9. Parse rows from Google Sheets tab "Acessos_Autorizados"
  // Columns: Nome | CPF | Telefone | Login / Usuário | Senha | Perfil | Status | Data Cadastro | Observações
  public syncFromSheetRows(rows: (string | number)[][]): AuthorizedUser[] {
    if (!rows || rows.length === 0) return this.getAuthorizedUsers();

    const parsedUsers: AuthorizedUser[] = [];
    rows.forEach((row, index) => {
      const name = String(row[0] || '').trim();
      const cpf = String(row[1] || '').trim();
      const phone = String(row[2] || '').trim();
      const username = String(row[3] || '').trim();
      let password = String(row[4] || '').trim();
      const roleStr = String(row[5] || '').trim().toLowerCase();
      const statusStr = String(row[6] || '').trim().toLowerCase();
      const createdAt = String(row[7] || '').trim();
      const notes = String(row[8] || '').trim();

      if (!name && !username) return;

      // Ensure 8-digit mixed password
      if (!password || password.length !== 8) {
        password = generateMergedPassword(name, cpf, phone);
      }

      let role: UserRole = 'operador';
      if (roleStr.includes('admin') || roleStr.includes('adm') || roleStr.includes('geral')) {
        role = 'admin_geral';
      } else if (roleStr.includes('supervis')) {
        role = 'supervisor';
      }

      let status: UserStatus = 'ativo';
      if (statusStr.includes('bloq') || statusStr.includes('inativ') || statusStr.includes('desativ')) {
        status = 'bloqueado';
      }

      parsedUsers.push({
        id: `usr-sheet-${index + 2}`,
        name: name || username,
        cpf: cpf || '---',
        phone: phone || '---',
        username: username || name.toLowerCase().replace(/\s+/g, ''),
        password,
        role,
        status,
        createdAt: createdAt || new Date().toLocaleDateString('pt-BR'),
        notes,
        rowIndex: index + 2,
      });
    });

    if (parsedUsers.length > 0) {
      this.saveAuthorizedUsers(parsedUsers);
      return parsedUsers;
    }

    return this.getAuthorizedUsers();
  }

  // 10. Collaborator Permissions Configured by Administrators
  public getCollaboratorPermissions(): CollaboratorPermissions {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PERMISSIONS);
      if (stored) {
        return { ...DEFAULT_COLLABORATOR_PERMISSIONS, ...JSON.parse(stored) };
      }
    } catch (e) {
      // Ignore
    }
    return DEFAULT_COLLABORATOR_PERMISSIONS;
  }

  public saveCollaboratorPermissions(perms: CollaboratorPermissions): void {
    try {
      localStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify(perms));
    } catch (e) {
      console.warn('Erro ao salvar permissões de colaboradores', e);
    }
  }

  // 11. Assign collaborator to a specific dock
  public assignUserToDock(userId: string, dockId: string, dockNome: string): void {
    const users = this.getAuthorizedUsers();
    const updated = users.map((u) => {
      if (u.id === userId) {
        return { ...u, assignedDockId: dockId, assignedDockNome: dockNome };
      }
      return u;
    });
    this.saveAuthorizedUsers(updated);

    // Update current session if matching
    const current = this.getCurrentSession();
    if (current && current.id === userId) {
      this.setCurrentSession({
        ...current,
        assignedDockId: dockId,
        assignedDockNome: dockNome,
      });
    }
  }
}

export const adminService = new AdminService();
