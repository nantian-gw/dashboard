"use client";

import { useParams } from "next/navigation";
import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { controlplane } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GRPCRouteForm } from "@/components/resources/grpcroute-form";
import { grpcRouteResourceToFormData } from "@/components/resources/grpcroute-form-codec";
import { HTTPRouteForm } from "@/components/resources/httproute-form";
import { httpRouteResourceToFormData } from "@/components/resources/httproute-form-codec";
import { TCPRouteForm } from "@/components/resources/tcproute-form";
import { tcpRouteResourceToFormData } from "@/components/resources/tcproute-form-codec";
import { TLSRouteForm } from "@/components/resources/tlsroute-form";
import { tlsRouteResourceToFormData } from "@/components/resources/tlsroute-form-codec";
import { UDPRouteForm } from "@/components/resources/udproute-form";
import { udpRouteResourceToFormData } from "@/components/resources/udproute-form-codec";

type SupportedRouteKind = "HTTPRoute" | "GRPCRoute" | "TCPRoute" | "TLSRoute" | "UDPRoute";
type RouteEditorInput = Parameters<typeof httpRouteResourceToFormData>[0];

type RouteEditorParams = {
  locale: string;
  kind: SupportedRouteKind;
  namespace: string;
  name: string;
};

type RouteEditorRenderer = (
  resource: Record<string, unknown>,
  params: RouteEditorParams
) => ReactElement;

const ROUTE_EDITORS: Record<SupportedRouteKind, RouteEditorRenderer> = {
  HTTPRoute: (resource, params) => (
    <HTTPRouteForm
      initialData={httpRouteResourceToFormData(resource as RouteEditorInput)}
      mode="edit"
      onSuccess={() => {
        window.location.href = `/${params.locale}/routes/${params.kind}/${params.namespace}/${params.name}`;
      }}
    />
  ),
  GRPCRoute: (resource, params) => (
    <GRPCRouteForm
      initialData={grpcRouteResourceToFormData(resource as RouteEditorInput)}
      mode="edit"
      onSuccess={() => {
        window.location.href = `/${params.locale}/routes/${params.kind}/${params.namespace}/${params.name}`;
      }}
    />
  ),
  TCPRoute: (resource, params) => (
    <TCPRouteForm
      initialData={tcpRouteResourceToFormData(resource as RouteEditorInput)}
      mode="edit"
      onSuccess={() => {
        window.location.href = `/${params.locale}/routes/${params.kind}/${params.namespace}/${params.name}`;
      }}
    />
  ),
  TLSRoute: (resource, params) => (
    <TLSRouteForm
      initialData={tlsRouteResourceToFormData(resource as RouteEditorInput)}
      mode="edit"
      onSuccess={() => {
        window.location.href = `/${params.locale}/routes/${params.kind}/${params.namespace}/${params.name}`;
      }}
    />
  ),
  UDPRoute: (resource, params) => (
    <UDPRouteForm
      initialData={udpRouteResourceToFormData(resource as RouteEditorInput)}
      mode="edit"
      onSuccess={() => {
        window.location.href = `/${params.locale}/routes/${params.kind}/${params.namespace}/${params.name}`;
      }}
    />
  ),
};

export default function EditRoutePage() {
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");
  const kind = String(params.kind || "HTTPRoute");

  const { data, isLoading, error } = useQuery({
    queryKey: ["route", "edit", kind, namespace, name],
    queryFn: () => controlplane.get(`/v1/resources/${kind.toLowerCase()}/${namespace}/${name}`),
    enabled: !!namespace && !!name,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load {kind}: {error instanceof Error ? error.message : "not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderEditor = ROUTE_EDITORS[kind as SupportedRouteKind];
  if (!renderEditor) {
    return (
      <div className="flex justify-center py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Unsupported route kind: {kind}
          </CardContent>
        </Card>
      </div>
    );
  }

  const locale = (params as { locale: string }).locale;
  return renderEditor(data as Record<string, unknown>, {
    locale,
    kind: kind as SupportedRouteKind,
    namespace,
    name,
  });
}
