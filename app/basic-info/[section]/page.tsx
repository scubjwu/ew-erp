import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBasicInfoSection } from "@/types/basic-info";

type BasicInfoSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function BasicInfoSectionPage({
  params,
}: BasicInfoSectionPageProps) {
  const { section: sectionSlug } = await params;
  const section = getBasicInfoSection(sectionSlug);

  if (!section) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {section.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {section.description}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/basic-info">返回基础信息总览</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>当前页面定义</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            该页面当前已绑定数据源 <code>{section.tableName}</code>，后续就在这里继续补列表、筛选、新增、编辑、导出。
          </p>
          <div>
            <div className="mb-2 text-muted-foreground">第一批字段</div>
            <div className="flex flex-wrap gap-2">
              {section.fields.map((field) => (
                <span
                  key={field}
                  className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>下一步实现</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. 列表查询与分页</p>
          <p>2. 搜索/筛选表单</p>
          <p>3. 新增与编辑表单</p>
          <p>4. 状态停用与导出</p>
        </CardContent>
      </Card>
    </div>
  );
}
