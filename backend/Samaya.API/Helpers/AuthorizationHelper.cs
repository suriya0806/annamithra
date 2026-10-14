using System.Security.Claims;

namespace Samaya.API.Helpers
{
    public static class AuthorizationHelper
    {
        public static int? GetOrganizationId(ClaimsPrincipal user)
        {
            var value = user.FindFirst("organizationId")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        public static int? GetBranchId(ClaimsPrincipal user)
        {
            var value = user.FindFirst("branchId")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        public static int? GetUserId(ClaimsPrincipal user)
        {
            var value = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user.FindFirst("sub")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        public static string? GetRole(ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.Role)?.Value;
        }

        public static bool IsOrganizationAdmin(ClaimsPrincipal user)
        {
            return user.IsInRole("Organization Admin");
        }

        public static bool IsBranchManager(ClaimsPrincipal user)
        {
            return user.IsInRole("Branch Manager");
        }

        public static bool IsBranchUser(ClaimsPrincipal user)
        {
            return !IsOrganizationAdmin(user) && GetBranchId(user).HasValue;
        }

        public static bool BelongsToBranch(ClaimsPrincipal user, int branchId)
        {
            var userBranchId = GetBranchId(user);
            return userBranchId.HasValue && userBranchId.Value == branchId;
        }

        public static string? GetBranchModuleType(ClaimsPrincipal user)
        {
            return user.FindFirst("branchModuleType")?.Value;
        }

        public static bool IsKmsEnabled(string? moduleType) =>
            moduleType == "KMS Only" || moduleType == "Both POS + KMS" || string.IsNullOrWhiteSpace(moduleType);

        public static bool IsPosEnabled(string? moduleType) =>
            moduleType == "POS Only" || moduleType == "Both POS + KMS" || string.IsNullOrWhiteSpace(moduleType);
    }
}
