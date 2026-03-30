"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { revalidateCompanyProfilesPage } from "@/app/basic-info/companies/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { createBrowserClient } from "@/lib/supabase/client";
import type { CompanyBankAccount } from "@/types/company-bank-account";
import type { CompanyProfile } from "@/types/company-profile";

const bankAccountSchema = z.object({
  account_name: z.string().trim().min(1, "Account name is required"),
  account_number: z.string().trim().min(1, "Account number is required"),
  bank_name: z.string().trim().min(1, "Bank name is required"),
  bank_code: z.string().trim(),
  bank_address: z.string().trim(),
  swift_code: z.string().trim(),
  remark: z.string().trim(),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

const EMPTY_ACCOUNT_FORM: BankAccountFormValues = {
  account_name: "",
  account_number: "",
  bank_name: "",
  bank_code: "",
  bank_address: "",
  swift_code: "",
  remark: "",
};

function toAccountFormValues(
  account: CompanyBankAccount | null
): BankAccountFormValues {
  if (!account) return EMPTY_ACCOUNT_FORM;
  return {
    account_name: account.account_name,
    account_number: account.account_number,
    bank_name: account.bank_name,
    bank_code: account.bank_code ?? "",
    bank_address: account.bank_address ?? "",
    swift_code: account.swift_code ?? "",
    remark: account.remark ?? "",
  };
}

type CompanyBankAccountsDialogProps = {
  open: boolean;
  company: CompanyProfile | null;
  onOpenChange: (open: boolean) => void;
};

export function CompanyBankAccountsDialog({
  open,
  company,
  onOpenChange,
}: CompanyBankAccountsDialogProps) {
  const [rows, setRows] = useState<CompanyBankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CompanyBankAccount | null>(
    null
  );

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: EMPTY_ACCOUNT_FORM,
  });

  const loadAccounts = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("company_bank_accounts")
        .select("*")
        .eq("company_profile_id", company.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRows((data ?? []) as CompanyBankAccount[]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load bank accounts",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (!open) return;
    void loadAccounts();
  }, [open, loadAccounts]);

  useEffect(() => {
    form.reset(toAccountFormValues(editingAccount));
  }, [editingAccount, form, editorOpen]);

  function openCreateAccount() {
    setEditingAccount(null);
    setEditorOpen(true);
  }

  function openEditAccount(account: CompanyBankAccount) {
    setEditingAccount(account);
    setEditorOpen(true);
  }

  async function onSubmit(values: BankAccountFormValues) {
    if (!company) return;

    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const payload = {
        company_profile_id: company.id,
        account_name: values.account_name,
        account_number: values.account_number,
        bank_name: values.bank_name,
        bank_code: values.bank_code || null,
        bank_address: values.bank_address || null,
        swift_code: values.swift_code || null,
        remark: values.remark || null,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from("company_bank_accounts")
          .update(payload)
          .eq("id", editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_bank_accounts")
          .insert(payload);
        if (error) throw error;
      }

      await revalidateCompanyProfilesPage();
      await loadAccounts();
      setEditorOpen(false);
      toast({
        title: editingAccount ? "Bank account updated" : "Bank account created",
        description: values.account_name,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: editingAccount
          ? "Could not update bank account"
          : "Could not create bank account",
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount(account: CompanyBankAccount) {
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("company_bank_accounts")
        .delete()
        .eq("id", account.id);

      if (error) throw error;

      await revalidateCompanyProfilesPage();
      await loadAccounts();
      toast({
        title: "Bank account deleted",
        description: account.account_name,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not delete bank account",
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {company?.company_name_cn ?? "Company"} - Bank Account Information
            </DialogTitle>
            <DialogDescription>
              Manage bank accounts linked to this company profile.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button onClick={openCreateAccount}>
              <Plus className="mr-2 size-4" />
              New Account
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No.</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Bank Code</TableHead>
                  <TableHead>Bank Address</TableHead>
                  <TableHead>SWIFT Code</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Loading bank accounts...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No bank accounts linked yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.account_name}</TableCell>
                      <TableCell>{row.account_number}</TableCell>
                      <TableCell>{row.bank_name}</TableCell>
                      <TableCell>{row.bank_code ?? "-"}</TableCell>
                      <TableCell>{row.bank_address ?? "-"}</TableCell>
                      <TableCell>{row.swift_code ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditAccount(row)}
                          >
                            <Pencil className="mr-2 size-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void deleteAccount(row)}
                          >
                            <Trash2 className="mr-2 size-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "New Account"}
            </DialogTitle>
            <DialogDescription>
              Link a bank account to the selected company.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="account_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter account name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter account number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bank_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter bank name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bank_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter bank code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bank_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter bank address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="swift_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SWIFT Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter SWIFT code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Enter remark" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {editingAccount ? "Save Changes" : "Create Account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
