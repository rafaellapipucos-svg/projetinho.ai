"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { messages } from "@/messages/pt-br";
import { MealTypesTab } from "./meal-types-tab";
import { FoodCategoriesTab } from "./food-categories-tab";
import { ExamTypesTab } from "./exam-types-tab";
import { AnamnesisTemplatesTab } from "./anamnesis-templates-tab";
import { SystemTab } from "./system-tab";

export function ConfigTabs() {
  return (
    <Tabs defaultValue="mealTypes">
      <TabsList>
        <TabsTrigger value="mealTypes">
          {messages.config.tabMealTypes}
        </TabsTrigger>
        <TabsTrigger value="foodCategories">
          {messages.config.tabFoodCategories}
        </TabsTrigger>
        <TabsTrigger value="examTypes">
          {messages.config.tabExamTypes}
        </TabsTrigger>
        <TabsTrigger value="anamnesis">
          {messages.patients.tabs.anamnesis}
        </TabsTrigger>
        <TabsTrigger value="system">{messages.config.tabSystem}</TabsTrigger>
      </TabsList>
      <TabsContent value="mealTypes">
        <MealTypesTab />
      </TabsContent>
      <TabsContent value="foodCategories">
        <FoodCategoriesTab />
      </TabsContent>
      <TabsContent value="examTypes">
        <ExamTypesTab />
      </TabsContent>
      <TabsContent value="anamnesis">
        <AnamnesisTemplatesTab />
      </TabsContent>
      <TabsContent value="system">
        <SystemTab />
      </TabsContent>
    </Tabs>
  );
}
