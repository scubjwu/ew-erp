import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BasicInfoSectionOverview } from "@/types/basic-info";

type BasicInfoDashboardProps = {
  sections: BasicInfoSectionOverview[];
};

export function BasicInfoDashboard({ sections }: BasicInfoDashboardProps) {
  const availableCount = sections.filter((section) => section.available).length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
      <section className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        <Card className="border-slate-800 bg-slate-950 text-slate-50">
          <CardHeader>
            <CardTitle className="text-xl">基础信息管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>
              第一阶段先把主数据和基础配置页立起来，不进入
              yard / transfer / lease / sale 操作。
            </p>
            <p>
              目前数据库已补齐公司信息、地区代码、运营价格配置，并对城市和堆场做了结构扩展。
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-slate-700 text-slate-200">
                {availableCount}/{sections.length} tables available
              </Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-200">
                CRUD shell ready
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>实现边界</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>读写主数据表，不复用旧 inventory 数据访问层。</p>
            <p>页面序号统一由前端 index 生成，不在数据库存储。</p>
            <p>删除优先走状态停用，避免直接破坏后续业务引用。</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.slug} className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{section.title}</CardTitle>
                <Badge variant={section.available ? "outline" : "destructive"}>
                  {section.available ? "Ready" : "Blocked"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <div className="text-muted-foreground">Data Source</div>
                <div className="font-mono text-xs">{section.tableName}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Current Rows</div>
                <div className="text-lg font-semibold">
                  {section.totalCount ?? "N/A"}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {section.available
                    ? `字段数 ${section.fields.length}`
                    : section.errorMessage ?? "Schema not available yet"}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/basic-info/${section.slug}`}>查看页面定义</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>页面</TableHead>
              <TableHead>数据源</TableHead>
              <TableHead>核心字段</TableHead>
              <TableHead className="w-28 text-right">当前行数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((section) => (
              <TableRow key={section.slug}>
                <TableCell>
                  <div className="font-medium">{section.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {section.description}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {section.tableName}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {section.fields.join(", ")}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {section.totalCount ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
