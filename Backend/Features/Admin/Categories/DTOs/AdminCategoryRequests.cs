using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Shopera.Features.Admin.Categories.DTOs
{
    public sealed class CreateAdminCategoryRequest
    {
        [Required]
        [StringLength(150)]
        public string CategoryName { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Description { get; set; }

        public int? ParentCategoryId { get; set; }
    }

    public sealed class UpdateAdminCategoryRequest
    {
        private int? _parentCategoryId;

        [StringLength(150)]
        public string? CategoryName { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        public bool UpdateParentCategory { get; set; }

        public int? ParentCategoryId
        {
            get => _parentCategoryId;
            set
            {
                _parentCategoryId = value;
                ParentCategoryProvided = true;
            }
        }

        [JsonIgnore]
        public bool ParentCategoryProvided { get; private set; }
    }
}
