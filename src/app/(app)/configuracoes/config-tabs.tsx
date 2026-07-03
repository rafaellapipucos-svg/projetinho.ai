"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { messages } from "@/messages/pt-br";
import { MealTypesTab } from "./meal-types-tab";
import { FoodCategoriesTab } from "./food-categories-tab";
import { ExamTypesTab } from "./exam-types-tab";
import { AnamnesisTemplatesTab } from "./anamnesis-templates-tab";
import { ServicesTab } from "./services-tab";
import { DocumentTemplatesTab } from "./document-templates-tab";
import { EquivalenceTab } from "./equivalence-tab";
import { SystemTab } from "./system-tab";

export function ConfigTabs() {
  return (
    <Tabs defaultValue="mealTypes">
      <TabsList className="flex-wrap">
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
        <TabsTrigger value="services">{messages.services.title}</TabsTrigger>
        <TabsTrigger value="documents">
          {messages.documents.templates.title}
        </TabsTrigger>
        <TabsTrigger value="equivalence">
          {messages.equivalence.title}
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
      <TabsContent value="services">
        <ServicesTab />
      </TabsContent>
      <TabsContent value="documents">
        <DocumentTemplatesTab />
      </TabsContent>
      <TabsContent value="equivalence">
        <EquivalenceTab />
      </TabsContent>
      <TabsContent value="system">
        <SystemTab />
      </TabsContent>
    </Tabs>
  );
}
