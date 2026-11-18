"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import DocumentEditor from "@/components/DocumentEditor";
import { Spinner } from "@/components/ui";
import type { DocType } from "@/lib/types";

const ALLOWED: DocType[] = ["in", "out", "opname", "return_in", "return_out", "transfer"];

function NewDoc() {
  const p = useSearchParams();
  const j = p.get("jenis") as DocType | null;
  const type: DocType = j && ALLOWED.includes(j) ? j : "in";
  return <DocumentEditor key={type} docType={type} initialItem={p.get("item")} />;
}

export default function NewDocumentPage() {
  return <Suspense fallback={<Spinner />}><NewDoc /></Suspense>;
}
