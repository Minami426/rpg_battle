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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

