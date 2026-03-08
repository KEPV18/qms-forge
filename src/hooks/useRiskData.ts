/**
 * React Query hook for Risk Register data
 * 
 * Provides data fetching, caching, and mutation capabilities
 * for the Risk Register module.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  getAllRisks,
  addRisk,
  updateRisk,
  calculateRiskStats,
  type Risk,
  type RiskInput,
  type RiskUpdate,
} from "@/lib/riskRegisterService";

const QUERY_KEY = ["risks"];

/**
 * Hook for fetching and managing Risk Register data
 */
export function useRiskData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all risks
  const {
    data: risks = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getAllRisks,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Add new risk mutation
  const addRiskMutation = useMutation({
    mutationFn: (input: RiskInput) => addRisk(input),
    onSuccess: (newRisk) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: "Risk Added",
        description: `Risk ${newRisk.riskId} has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Risk",
        description: error.message.includes("API key")
          ? "Write operations require OAuth authentication. Current API key is read-only."
          : error.message,
        variant: "destructive",
      });
    },
  });

  // Update risk mutation
  const updateRiskMutation = useMutation({
    mutationFn: ({ riskId, updates }: { riskId: string; updates: RiskUpdate }) =>
      updateRisk(riskId, updates),
    onSuccess: (updatedRisk) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: "Risk Updated",
        description: `Risk ${updatedRisk.riskId} has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Risk",
        description: error.message.includes("API key")
          ? "Write operations require OAuth authentication. Current API key is read-only."
          : error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate statistics
  const stats = calculateRiskStats(risks);

  return {
    risks,
    stats,
    isLoading,
    isError,
    error,
    refetch,
    addRisk: addRiskMutation.mutate,
    updateRisk: updateRiskMutation.mutate,
    isAdding: addRiskMutation.isPending,
    isUpdating: updateRiskMutation.isPending,
  };
}

/**
 * Hook for fetching a single risk by ID
 */
export function useRisk(riskId: string) {
  const { risks, isLoading, isError } = useRiskData();
  const risk = risks.find((r) => r.riskId === riskId);

  return {
    risk,
    isLoading,
    isError,
    notFound: !isLoading && !risk,
  };
}
