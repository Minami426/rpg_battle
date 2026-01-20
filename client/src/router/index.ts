import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import LoginPage from "../pages/LoginPage.vue";
import RegisterPage from "../pages/RegisterPage.vue";
import StartPage from "../pages/StartPage.vue";
import PartySelectPage from "../pages/PartySelectPage.vue";
import BattlePage from "../pages/BattlePage.vue";
import MenuPage from "../pages/MenuPage.vue";
import StatsPage from "../pages/StatsPage.vue";
import RunDetailPage from "../pages/RunDetailPage.vue";

// Admin pages
import AdminLoginPage from "../pages/AdminLoginPage.vue";
import AdminPage from "../pages/AdminPage.vue";
import AdminCharacterEditPage from "../pages/AdminCharacterEditPage.vue";
import AdminSkillEditPage from "../pages/AdminSkillEditPage.vue";
import AdminItemEditPage from "../pages/AdminItemEditPage.vue";
import AdminConditionEditPage from "../pages/AdminConditionEditPage.vue";
import AdminEnemyEditPage from "../pages/AdminEnemyEditPage.vue";

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: LoginPage },
  { path: "/register", component: RegisterPage },
  { path: "/start", component: StartPage },
  { path: "/party", component: PartySelectPage },
  { path: "/battle", component: BattlePage },
  { path: "/menu", component: MenuPage },
  { path: "/stats", component: StatsPage },
  { path: "/runs/:id", component: RunDetailPage, props: true },

  // Admin routes
  { path: "/admin/login", component: AdminLoginPage },
  { path: "/admin", component: AdminPage },
  { path: "/admin/characters", component: AdminCharacterEditPage },
  { path: "/admin/skills", component: AdminSkillEditPage },
  { path: "/admin/items", component: AdminItemEditPage },
  { path: "/admin/conditions", component: AdminConditionEditPage },
  { path: "/admin/enemies", component: AdminEnemyEditPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

