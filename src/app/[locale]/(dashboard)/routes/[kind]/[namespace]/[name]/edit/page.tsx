"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import type { ReactElement } from "react";
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";
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

type RouteEditorRenderer = (
  resource: Record<string, unknown>
) => ReactElement;

function createRouteEditors(onSuccess: () => void): Record<SupportedRouteKind, RouteEditorRenderer> {
  return {
    HTTPRoute: (resource) => (
      <HTTPRouteForm
        initialData={httpRouteResourceToFormData(resource as RouteEditorInput)}
        mode="edit"
        onSuccess={onSuccess}
      />
    ),
    GRPCRoute: (resource) => (
      <GRPCRouteForm
        initialData={grpcRouteResourceToFormData(resource as RouteEditorInput)}
        mode="edit"
        onSuccess={onSuccess}
      />
    ),
    TCPRoute: (resource) => (
      <TCPRouteForm
        initialData={tcpRouteResourceToFormData(resource as RouteEditorInput)}
        mode="edit"
        onSuccess={onSuccess}
      />
    ),
    TLSRoute: (resource) => (
      <TLSRouteForm
        initialData={tlsRouteResourceToFormData(resource as RouteEditorInput)}
        mode="edit"
        onSuccess={onSuccess}
      />
    ),
    UDPRoute: (resource) => (
      <UDPRouteForm
        initialData={udpRouteResourceToFormData(resource as RouteEditorInput)}
        mode="edit"
        onSuccess={onSuccess}
      />
    ),
  };
}

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

  const router = useLocalizedDashboardRouter();
  const handleSuccess = useCallback(() => {
    router.push(`/routes/${kind}/${namespace}/${name}`);
  }, [router, kind, namespace, name]);

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

  const routeEditors = createRouteEditors(handleSuccess);
  const renderEditor = routeEditors[kind as SupportedRouteKind];
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

  return renderEditor(data as Record<string, unknown>);
}
