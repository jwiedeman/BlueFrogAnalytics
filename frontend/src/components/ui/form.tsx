import * as React from "react";
import {
  FormProvider,
  type UseFormReturn,
  Controller,
  type ControllerProps,
} from "react-hook-form";
import { cn } from "@/lib/utils";

interface FormProps<T> extends React.FormHTMLAttributes<HTMLFormElement> {
  form: UseFormReturn<T>;
}

function Form<T>({ form, ...props }: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form {...props} />
    </FormProvider>
  );
}

function FormField<TFieldValues>(props: ControllerProps<TFieldValues>) {
  return <Controller {...props} />;
}

function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

function FormControl({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

function FormMessage({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-destructive", className)} {...props} />;
}

export { Form, FormField, FormItem, FormControl, FormMessage };
