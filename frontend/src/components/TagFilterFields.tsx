import {TagAutocomplete, type TagField, type TagItem} from './TagAutocomplete'

const tagFields: {field: TagField; label: string}[] = [
    {field: 'INSTITUTION', label: 'Institution'},
    {field: 'PROGRAM', label: 'Program / position'},
    {field: 'TOPIC', label: 'Topic'},
    {field: 'SUBTOPIC', label: 'Subtopic'},
]

interface TagFilterFieldsProps {
    tags: TagItem[]
    selectedTagIds: number[]
    onChange: (tagIds: number[]) => void
}

export function TagFilterFields({tags, selectedTagIds, onChange}: TagFilterFieldsProps) {
    return (
        <div className="tag-filter-fields">
            {tagFields.map(({field, label}) => (
                <TagAutocomplete
                    key={field}
                    availableTags={tags}
                    field={field}
                    selectedTags={tags.filter((tag) => tag.field === field && selectedTagIds.includes(tag.id))}
                    onChange={(fieldTags) => {
                        const otherTagIds = selectedTagIds.filter((id) => !tags.some((tag) => tag.id === id && tag.field === field))
                        onChange([...otherTagIds, ...fieldTags.map((tag) => tag.id)])
                    }}
                    label={label}
                    placeholder={`Search ${label.toLowerCase()} tags...`}
                />
            ))}
        </div>
    )
}